<?php

$config = array(

    'admin' => array(
        'core:AdminPassword',
    ),

    'example-userpass' => array(
        'exampleauth:UserPass',
        'frodo.baggins:showmerings' => array(
            'uid' => array('1'),
            'eduPersonAffiliation' => array('group1'),
            'email' => 'frodo.baggins@saml.mage.test',
        ),
        'samwise.gamgee:bringyourgardner' => array(
            'uid' => array('2'),
            'eduPersonAffiliation' => array('group2'),
            'email' => 'samwise.gamgee@saml.mage.test',
        ),
    ),

);