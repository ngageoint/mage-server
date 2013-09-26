%define ver  1.0.0
%define rel  rc3

Name:          mage         
Version:       %{ver}
Release:       %{rel}
Summary:       ESRI Feature Server using node.js 
Group:         Applications/Internet
License:       Proprietary 
URL:           http://mage.geointapps.org
BuildArch:     x86_64
Source0:       http://geointapps.org/dist/%{name}-v%{version}-%{release}.tar.gz
BuildRoot:     %{_tmppath}/%{name}-v%{version}-%{release}-root-%(%{__id_u} -n)
Requires:      mongodb, nodejs, npm
#Requires(hint): httpd or nginx #(or doesn't work here!)
Requires(pre): /usr/sbin/useradd

%description
ESRI compliant RESTful Feature Server free of licensing.

# Create the mage user and group.
%pre
getent group mage >/dev/null || groupadd -r mage
getent p***REMOVED***wd mage >/dev/null || \
    useradd -r -g mage -d /opt/mage -s /sbin/nologin \
    -c "MAGE user for node.js server" mage 
exit 0

# Unpack the mage tarball/zipfile.
%prep
%setup -q -n %{name}-v%{version}-%{release}

# MAGE isn't compiled, so there is nothing to do here.
%build

# Copy the source to a temporary build directory.
%install
mkdir -p %{buildroot}/opt/%{name}-v%{version}-%{release}
cp -pR * %{buildroot}/opt/%{name}-v%{version}-%{release}
install -d %{buildroot}/var/lib/%{name}-v%{version}-%{release}

# Install the init script daemon
mkdir -p %{buildroot}/etc/init.d
mv %{buildroot}/opt/%{name}-v%{version}-%{release}/packaging/rhel-centos/\
mage %{buildroot}/etc/init.d
rm -rf %{buildroot}/opt/%{name}-v%{version}-%{release}/packaging
#rm -rf %{buildroot}

# Remove the temporary directories after creating the RPM.
%clean
#rm -rf %{buildroot}

%post
# @todo npm install ?
# Start MAGE after it is installed?

%preun
%postun

# Recursively include everything.
%files
%defattr(755,mage,mage,755)
/opt/%{name}-v%{version}-%{release}
# MAGE uses /var/lib/mage-v<version> for user uploads
%dir /var/lib/%{name}-v%{version}-%{release}
%defattr(755,root,root,755)
/etc/init.d/mage

#%doc AUTHORS ChangeLog LICENSE README.md

# The name of our RPM is derived from the most recent version number.
%changelog
* Fri Sep 20 2013 Ben Hosmer <ben.hosmer@gmail.com> 1.0.0-rc3
- Update RPM using upstream Release Candidate 3

* Tue Jun 18 2013 Ben Hosmer <ben.hosmer@gmail.com> 0.1.0 
- Initial RPM using upstream v0.1.0

