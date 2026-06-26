const { Client, InvalidCredentialsError } = require('ldapts')
  , log = require('winston')
  , User = require('../models/user')
  , Role = require('../models/role')
  , TokenAssertion = require('./verification').TokenAssertion
  , api = require('../api')
  , userTransformer = require('../transformers/user')
  , { app, tokenService } = require('./index');



async function authenticateLdap(username, password, strategy) {
  const client = new Client({ url: strategy.settings.url });
  try {
    await client.bind(strategy.settings.bindDN, strategy.settings.bindCredentials);

    const filter = strategy.settings.searchFilter.replace(/\{\{username\}\}/g, escapeFilter(username));
    const { searchEntries } = await client.search(strategy.settings.searchBase, {
      scope: strategy.settings.searchScope || 'sub',
      filter
    });

    if (!searchEntries.length)
      return null;

    const userEntry = searchEntries[0];
    const bindAttr = strategy.settings.bindProperty;
    const bindDN = (bindAttr && userEntry[bindAttr]) ? userEntry[bindAttr] : userEntry.dn;
    await client.bind(bindDN, password);

    if (strategy.settings.groupSearchBase) {
      const groupDnAttr = strategy.settings.groupDnProperty || 'dn';
      const groupFilter = strategy.settings.groupSearchFilter.replace(/\{\{dn\}\}/g, escapeFilter(userEntry[groupDnAttr]));
      const { searchEntries: groupEntries } = await client.search(strategy.settings.groupSearchBase, {
        scope: strategy.settings.groupSearchScope || 'sub',
        filter: groupFilter
      });
      
      if (!groupEntries.length)
        return null;

      userEntry.groups = groupEntries;
    }

    return userEntry;
  } finally {
    await client.unbind().catch(() => {});
  }
}

function ldapErrorMessage(err, strategyTitle) {
  const diag = err.message || '';
  
  if (diag.includes('530')) return `Not Permitted to login to ${strategyTitle} account at this time.`;
  if (diag.includes('531')) return `Not permited to logon to ${strategyTitle} account at this workstation.`;
  if (diag.includes('532')) return `${strategyTitle} password expired.`;
  if (diag.includes('533')) return `${strategyTitle} account disabled.`;
  if (diag.includes('701')) return `${strategyTitle} account expired.`;
  if (diag.includes('773')) return `User must reset ${strategyTitle} password.`;
  if (diag.includes('775')) return `${strategyTitle} user account locked.`;
  
  return `Invalid ${strategyTitle} username/password.`;
}

function setDefaults(strategy) {
  if (!strategy.settings.profile) {
    strategy.settings.profile = {};
  }
  if (!strategy.settings.profile.displayName) {
    strategy.settings.profile.displayName = 'givenname';
  }
  if (!strategy.settings.profile.email) {
    strategy.settings.profile.email = 'mail';
  }
  if (!strategy.settings.profile.id) {
    strategy.settings.profile.id = 'cn';
  }
}

function escapeFilter(value) {
  return value.replace(/[\\*()\x00]/g, char => {
    return '\\' + char.charCodeAt(0).toString(16).padStart(2, '0');
  });
}

// Handle multi value arrays in case a user attribute has more than one value (e.g. multiple email addresses).
function singleValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function initialize(strategy) {
  setDefaults(strategy);
  log.info('Configuring ' + strategy.title + ' authentication');
  if (strategy.settings.url && !strategy.settings.url.startsWith('ldaps:')) {
    log.warn(strategy.title + ' LDAP URL is not using ldaps:// — credentials will be transmitted without TLS');
  }

  app.post(`/auth/${strategy.name}/signin`, async function (req, res, next) {
    if (!req.body.username || !req.body.password) {
      return res.status(401).send(`Invalid ${strategy.title} username/password.`);
    }

    let profile;
    try {
      profile = await authenticateLdap(req.body.username, req.body.password, strategy);
    } catch (err) {
      const isAuthError = err instanceof InvalidCredentialsError ||
       err.name === 'LdapResultError' ||
       (err.message && err.message.includes('data '));

      if (isAuthError) {
        return res.status(401).send(ldapErrorMessage(err, strategy.title));
      }
      return next(err);
    }

    if (!profile) {
      return res.status(401).send(`Invalid ${strategy.title} username/password.`);
    }

    const username = singleValue(profile[strategy.settings.profile.id]);

    let user;
    try {
      user = await new Promise((resolve, reject) => {
        User.getUserByAuthenticationStrategy(strategy.name, username, (err, u) => {
          if (err)
            reject(err);
          else
            resolve(u);
        });
      });
    } catch (err) {
      return next(err);
    }

    if (!user) {
      let role;
      try {
        role = await new Promise((resolve, reject) => {
          Role.getRole('USER_ROLE', (err, r) => { 
            if (err)
              reject(err);
            else
              resolve(r);
          });
        });
      } catch (err) {
        return next(err);
      }

      if (!role) {
        log.error('USER_ROLE not found in database');
        return next(new Error('Server configuration error'));
      }

      const newUserData = {
        username,
        displayName: singleValue(profile[strategy.settings.profile.displayName]),
        email: singleValue(profile[strategy.settings.profile.email]),
        active: false,
        roleId: role._id,
        authentication: {
          type: strategy.name,
          id: username,
          authenticationConfiguration: { name: strategy.name }
        }
      };

      let newUser;
      try {
        newUser = await new api.User().create(newUserData);
      } catch (err) {
        return next(err);
      }

      if (!newUser.authentication.authenticationConfiguration?.enabled) {
        log.warn(newUser.authentication.authenticationConfiguration?.title + ' authentication is not enabled');
        return res.status(401).send('Authentication method is not enabled, please contact a MAGE administrator for assistance.');
      }
      if (!newUser.active) {
        return res.status(403).send('User account is not approved, please contact your MAGE administrator to approve your account.');
      }
      user = newUser;
    }

    if (!user.active) {
      return res.status(403).send('User account is not approved, please contact your MAGE administrator to approve your account.');
    }

    if (!user.enabled) {
      log.warn('Failed user login attempt: User ' + user.username + ' account is disabled.');
      return res.status(401).send('Your account has been disabled, please contact a MAGE administrator for assistance.');
    }

    if (!user.authentication.authenticationConfigurationId) {
      log.warn('Failed user login attempt: ' + user.authentication.type + ' is not configured');
      return res.status(401).send(user.authentication.type + ' authentication is not configured, please contact a MAGE administrator for assistance.');
    }

    if (!user.authentication.authenticationConfiguration?.enabled) {
      log.warn('Failed user login attempt: Authentication ' + user.authentication.authenticationConfiguration?.title + ' is disabled.');
      return res.status(401).send(user.authentication.authenticationConfiguration?.title + ' authentication is disabled, please contact a MAGE administrator for assistance.');
    }

    try {
      const token = await tokenService.generateToken(user._id.toString(), TokenAssertion.Authorized, 60 * 5);
      res.json({
        user: userTransformer.transform(user, { path: req.getRoot() }),
        token
      });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { initialize };
