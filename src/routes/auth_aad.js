/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import express from "express";
import msal from '@azure/msal-node';
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

//const SERVER_PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"; 
const REDIRECT_URI = BASE_URL + "/auth/redirect";
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET
const TENANT_ID = process.env.TENANT_ID;
const AUTHORITY="https://login.microsoftonline.com/" + TENANT_ID
const DISCOVERY_KEYS_ENDPOINT = AUTHORITY + "/discovery/v2.0/keys";

// Before running the sample, you will need to replace the values in the config, 
// including the clientSecret
const config = {
    auth: {
        clientId: CLIENT_ID,
        authority: AUTHORITY,
        clientSecret: CLIENT_SECRET
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        }
    }
};

const validateJwt = (req, res, next) => {
    let authHeader = req.headers.authorization;
    //in case the jwt is in the cookie: 
    if ( authHeader == null ) {
        authHeader = "Bearer " + req.headers["cookie"].split(";")[0].split("=")[1];
    }
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        
        const validationOptions = {
            audience: "api://" + config.auth.clientId, // v2.0 token
            issuer: "https://sts.windows.net/" + TENANT_ID + "/" // config.auth.authority + "/v2.0" // v2.0 token
        }

        jwt.verify(token, getSigningKeys, validationOptions, (err, payload) => {
            if (err) {
                console.log(err);
                return res.sendStatus(403);
            }
            req.user=payload.unique_name;
            next();
        });
        //return true;
    } else {
        //return false;
        res.sendStatus(401);
    }
};

export {validateJwt}

const getSigningKeys = (header, callback) => {
    var client = jwksClient({
        jwksUri: DISCOVERY_KEYS_ENDPOINT
    });

    client.getSigningKey(header.kid, function (err, key) {
        var signingKey = key.publicKey || key.rsaPublicKey;
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
        scopes: ["api://***REMOVED***/***REMOVED***"],
        redirectUri: REDIRECT_URI,
    };

    // get url to sign user in and consent to scopes needed for application
    pca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
        res.redirect(response);
    }).catch((error) => console.log(JSON.stringify(error)));
})

 .get('/redirect', (req, res) => {
    const tokenRequest = {
        code: req.query.code,
        //scopes: ["user.read"],
        scopes: ["api://***REMOVED***/***REMOVED***"],
        redirectUri: REDIRECT_URI,
    };

    
    pca.acquireTokenByCode(tokenRequest).then((response) => {
        // console.log("\nResponse: \n:", response);
        //console.log("access token:", response.accessToken);
        //res.setHeader ('Authorization',  req.header.authorization);
        //res.redirect(302,'/');
        res.cookie("token", response.accessToken, {
            httpOnly: false,
            secure: false,
        });
        res.send("logged in. <script > window.location.assign('/')</script>");
    }).catch((error) => {
        console.log(error);
        res.status(500).send(error);
    });
});
export default auth;

//app.listen(SERVER_PORT, () => console.log(`Msal Node Auth Code Sample app listening on port ${SERVER_PORT}!`))
