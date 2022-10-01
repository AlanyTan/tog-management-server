# Acerta Feature Tog Management Server

Server application that provides management of Feature Toggle flags and experiments. 
Credit goes to  [Tog](https://github.com/escaletech/tog).

## Architecture
There will be 3 pieces needed: 
1) at its core, a Redis instance is needed, we use HASH to store the flag keys and Pub/Sub to "push" notification to all clients who subscribed to "flags changed" channel. 
2) the tog-node client.  Currently we only have a Typescript client. Although adding additional clients is in the roadmap. (for other languages, keep reading...)
3) the management server (this repo).  The management server is used to add/update/delete flags. But also offers REST API for all flags, so that any language can call REST API will be able to retrieve any flag values. 

## Authentication and Authentication
This forked repo uses Azure AAD authentication (An Acerta employ who has been granted access to the registered app in Azure will be allowed to use this app)
To grant permission to a user, add this user to permission list for Azure registered app "***REMOVED***".  This app registration need to have a Redirect URI configured to recognize BASE_URL/auth/redirect. 

The following EnVars are important to configure how AAD intergration will interact with Microsoft Azure backend. 
```
TENANT_ID="***REMOVED***"
CLIENT_ID="***REMOVED***"
CLIENT_SECRET="it's a secret... so i'm not showing it here."
APP_NAME="***REMOVED***"
```

### Registert the app in Azure
use Azure Active Directory blade to register a new app (i.e. AZR-Stg-AdAp-CaC1-FTog). 
in its Certificates & secrets tab, create a new client secret, this is required for later stage.  (See bottom of this doc for helpful hint on steps needed to add authorization scope that is *not* Microsoft Graph so the token can be validated by jwt lib)

## Launch the app:
the following example shows you how to test it locally: 
```sh
$ docker run -d -p 3000:3000 \
 -env "PORT=3000" \
 -env 'REDIS_URL=localhost:6379' \
 -env 'REDIS_CLUSTER="false"' \
 -env 'BASE_URL="http://localhost:3000"' \
 -env 'TENANT_ID="***REMOVED***"' \
 -env 'CLIENT_ID="***REMOVED***"' \
 -env 'CLIENT_SECRET="***REMOVED***"' \
 -env 'APP_NAME="***REMOVED***"' \
  tog-management-server
```

### Configuration variables

* `PORT` the port this management server will be listening on
* `REDIS_URL` the Redis server address, i.e. "localhost:6379"
* `REDIS_CLUSTER` if this redis is a clust i.e. "false"
* `BASE_URL` this is the base URL where the management server can be reached (i.e. public domain name with external port), also $BASE_URL/auth/redirect need to be registered in the Azure apps registration. i.e. "http://localhost:3000"
* `TENANT_ID` this is the Azure tenant in which the app is registered i.e. "***REMOVED***"
* `CLIENT_ID` the ClientID is assigned to the app when it is registered in Azure, "***REMOVED***"
* `CLIENT_SECRET` the client secret configured in Azure app registration 
* `APP_NAME`= the name of the app registration i.e. "***REMOVED***"


## usage:
To use the management server, visit the root of the base_url, i.e. `http://localhost:3000`
The management server will try to validate you via your Authorization Bearer token in the header or the cookie it has assigned to you after your previous successful login. 

If you can't be authenticated, or authorized (i.e. your jwt expired), you will be automatically redirected to the login page (you can also manually force a login by going to ${BASE_URL}/auth). Please note, there is no logout, to log yourself out, please use the Azure portal, and chose logout there. 

Once you login, you should see the simple management page where you can add/update/delete flags. 
NOTE! the UI is very simple and there aren't lots of validations and double checks, so be careful what you are doing. 


## How Tog works
Basic concepts: 
Application Name (or tog namespace) is a grouping, within each "Application Name", you can not have duplicate flags (if you try to add a key that is already existing, your new value will replace the old value).  But of course in different Applications Names, you can have flags spelled the same. 

A flag, (or "feature flag", or "flag key") is a string that uniquely (within the Application Name) identifies a flag, you can turn it on or off.  Tog can also support gradual roll out by assign a percentage to each flag, but the simple management UI does not expose this yet. 

A session, a session is a self-identifying way of differentiating one user interaction from another.  Only the tog client (tog-node) care about session. For example, you open Chrome and then Firefox to visit linepulse, each of one of these two would be a separate session.  Tog uses session info to determine the percentage roll-out - based on the hash of your session id (you provide when you call the client), it determines if a feature should be on or off for you. Session is not used when the rollout policy is 100% one way or another. 


For more info on the concept of tog, please visit [tog_spec](./tog_spec.md)

## sample code how to use feature toggles in Typescript code: 
In the following example, I show how to insert the tog code into the ConfigService of a Nest.js repo. 
This allows any module that imports the ConfigService to simply call the tog client to retrieve the value of a flag.

```Typescript
import { FlagClient , SessionClient } from "tog-node";

@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  private sessions = new SessionClient('redis://127.0.0.1:6379', {"timeout": 30000});

  public async getFeatureFlag(key: string) : Promise<boolean> {
    const session = await this.sessions.session('capmetrics', 'session-id' );

    return new Promise(function (resolve, reject) {
      if (session.flags[key] == null) {
        resolve(false);
      } else {
        resolve(session.flags[key]);
      }
    });
    //return await session.flags[key] || false
  }
...
}
```
Please node this is server side code, and I just used string "session-id" here. you can replace it with any string you like to identify your session.  Please note if the gradual roll out is used, this session string you chose should be consistent enough so this session will always have the same id, so that the user's experience is consistent. 

Then in other modules that have configService imported, 
```Typescript
export class CalculationsService {
  // function spc is for API v1 only, once api v1 retires, spc function should be removed as well.
  constructor(
    private readonly configService: ConfigService
  ) {}
  ....
  async calculateSPC(
    data: spcDataFrame,
    onlyAlerts?: boolean
  ): Promise<SpcDtoV3> { 
      const FF_lines_v1_calcalerts = await this.configService.getFeatureFlag("lines.v1.calcalerts");
      if ( FF_lines_v1_calcalerts ) { 
        // do new things for this feature
      } else {
        // do old things when this feature is turned off
      }
    ...
  }
```
For example, wrap your old code in the "else {}" section, and add your new code to the "if ( FF is on ) {}" section. 
If you are using Nest.js, please consider controlling the feature flag at Controller level, unless this is a non-breaking change (i.e. change from native arithmatic to decimal.js is most likely a non-breaking change for most web apps; Changing the JSON structure of signal mapping will likely be a breaking change.)

For more info, you can check the [tog-node repo](https://github.com/escaletech/tog-node)


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