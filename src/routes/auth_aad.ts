/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import express from "express";
import * as msal from '@azure/msal-node';
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import {appConfig } from "../services/config"


const REDIRECT_URI = appConfig.baseUrl + "/auth/redirect";
//const AUTH_URL = appConfig.baseUrl + "/auth";
const AUTHORITY="https://login.microsoftonline.com/" + appConfig.TENANT_ID
const DISCOVERY_KEYS_ENDPOINT = AUTHORITY + "/discovery/v2.0/keys";

// Before running the sample, you will need to replace the values in the config, 
// including the clientSecret
const config = {
    auth: {
        clientId: appConfig.CLIENT_ID,
        authority: AUTHORITY,
        clientSecret: appConfig.CLIENT_SECRET
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel:any, message:any, containsPii:any) {
                console.log(loglevel, message, containsPii);
            },
            piiLoggingEnabled: false,
            logLevel: msal?.LogLevel?.Verbose,
        }
    }
};

const validateJwt = (req:any, res:any, next:any) => {
    let authHeader = req.headers.authorization;
    //in case the jwt is in the cookie: 
    if ( authHeader == null ) {
        authHeader = "Bearer " + req.headers["cookie"]?.split(";")[0]?.split("=")[1];
    }
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        
        const validationOptions = {
            audience: "api://" + config.auth.clientId, // Azure registered App audience
            issuer: "https://sts.windows.net/" + appConfig.TENANT_ID + "/" // Azure registered App issuer
        }

        jwt.verify(token, getSigningKeys, validationOptions, (err, payload) => {
            if (err) {
                console.log(err);
                return res.send("Not authorized: <script> window.location.assign('/auth')</script>" + err.message, 403);
            }
            req.user = ( typeof payload == "object" ) ? payload["unique_name"] : "someone" ;
            next();
        });
        //return true;
    } else {
        //return false;
        res.send("Not Authenticated.  Have you logged in to AAD yet? <script> window.location.assign('/auth')</script>", 401);
    }
};

export {validateJwt}

const getSigningKeys = (header: any, callback:any) => {
    var client = jwksClient({
        jwksUri: DISCOVERY_KEYS_ENDPOINT
    });

    client.getSigningKey(header.kid, function (err, key) {
        var signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}
// Create msal application object
const pca = new msal.ConfidentialClientApplication(config);

// Create Express App and Routes
// module.exports = express.Router()
const auth = express.Router()
 .get('/', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ["api://" + appConfig.CLIENT_ID + "/" + appConfig.APP_NAME],
        redirectUri: REDIRECT_URI,
    };

    // get url to sign user in and consent to scopes needed for application
    pca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
        res.redirect(response);
    }).catch((error) => console.log(JSON.stringify(error)));
})

 .get('/redirect', (req, res) => {
    const tokenRequest = {
        scopes: ["api://" + appConfig.CLIENT_ID + "/" + appConfig.APP_NAME],
        redirectUri: REDIRECT_URI,
        code: (typeof req.query.code == "string" )? req.query.code : "",
    };

    
    pca.acquireTokenByCode(tokenRequest).then((response) => {   
        //if token retrieval is successful, set it into cookie as 'token=${token}'    
        res.cookie("token", response.accessToken, {
            httpOnly: false,
            secure: false,
        });
        //set auto refresh of the page to the /auth/redirect
        res.send("logged in. <script> window.location.assign('/')</script>");
    }).catch((error) => {
        console.log(error);
        res.status(500).send(error);
    });
});
export default auth;

