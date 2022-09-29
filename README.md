# Acerta Feature Tog Management Server

Server application that provides management of Feature Toggle flags and experiments. 
Best used with [Tog CLI](https://github.com/escaletech/tog-cli).

## Authentication
This forked repo replaces google+passport authentication with Azure AAD authentication (An Acerta employ who has been granted access to the registered app in Azure will be allowed to use this app)

### Registert the app in Azure
use Azure Active Directory blade to register a new app (i.e. AZR-Stg-AdAp-CaC1-FTog). 
in its Certificates & secrets tab, create a new client secret, this is required for later stage. 

## Usage

```sh
$ docker run -d -p 3000:3000 \
  --env 'OAUTH_CLIENT_ID=XYZ' \
  --env 'OAUTH_CLIENT_SECRET=XYZ' \
  --env 'OAUTH_CALLBACK_URL=https://<DOMAIN>/auth/google/callback' \
  --env 'CLIENT_SECRET=<the client secret value generated above> \
  --env 'REDIS_URL=redis://your-redis:6379' \
  escaletech/tog-management-server
```

### Configuration variables

* `OAUTH_CLIENT_ID` - Client ID for OAuth 2 authentication (**required**, see [Authentication](#authentication))
* `OAUTH_CLIENT_SECRET` - Client secret for OAuth 2 authentication (**required**, see [Authentication](#authentication))
* `OAUTH_CALLBACK_URL` - Redirect uri for OAuth 2 authentication (**required**, see [RedirectURI](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#redirecting))
* `REDIS_URL` - URL for the Redis server used by Tog (**required**, e.g. `redis://my-redis-server.com`)
* `REDIS_CLUSTER` - Set to `true` if Redis URL is a cluster (**optional**, default: `false`)
* `DOMAIN_WHITELIST` - If specified, only users from these domains will be allowed (**optional**, e.g. `escale.com.br`)

### Authentication

Currently the only supported OAuth 2 authentication provider is Google.

1. Go to [Create OAuth client ID - Google API Console](https://console.developers.google.com/apis/credentials/oauthclient)
2. When asked for **Application type**, select **Web application**
3. Add `https://<YOUR-DOMAIN>` as **Authorized JavaScript origins**
4. Add `https://<YOUR-DOMAIN>/auth/google/callback` as **Authorized redirect URIs**
5. Click **Create**
6. Use the provided **Client ID** and **Client secret** for running the server

An optional step is to define a **domain whitelist** to only allow users from a certain domain to use the API.


# validating AAD token 

## helpful notes in setting up the application to be verifiable:
The Azure registered App by default sends tokens for Microsoft Graph backends. 

To be able to validate a proper JWT token, we need to configure the app to issue tokens for scope of the application clientId/scope. 

The defaul scope is "User.read" which is for ms graph, we actually need to use something like "api://***REMOVED***/***REMOVED***" as audience, and the issuer is also different, here is an example of how the JWT.verify options should look like: 
```
        const validationOptions = {
            audience: "api://" + config.auth.clientId, 
            issuer: "https://sts.windows.net/" + TENANT_ID + "/" 
        }
```

"Hi,

We finally succeeded with the token validation. In fact, it's was only a configuration problem.

On the frontend application, we used MSAL.js. Everything was fine except the scopes we requested for login and acquiring tokens.

On the Azure Portal, if you go to your application page, on the left there is a "Scopes" menu entry.
There was one scope defined for our application (if not, I think you can add it. I'm not he one in charge of the configuration here, so can't check).

This value need to be used in MSAL.js as your scope.

If you use scopes like "User.read", "openid", "profile", "email", ... You'll see that the audience value in the JWT access token will be set to graph.microsoft.com.
So the token is indeed for graph, and not for your application.

If you use the scope you have declared in your application on the portal, you'll see that the audience is the same value as the scope and the token will be valid !
Our scope looks something like this : https://.onmicrosoft.com//user_impersonation

We had the help of a Developper from Microsoft for this solution :)
"