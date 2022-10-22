# Acerta Feature Tog Management Server

Server application that provides management of Feature Toggle flags and experiments. 
Credit goes to  [Tog](https://github.com/escaletech/tog).

## Architecture
There will be 3 pieces needed: 
1) at its core, a Redis instance is needed, we use HASH to store the flag keys and Pub/Sub to "push" notification to all clients who subscribed to "flags changed" channel. 
2) the tog-node client.  Currently we only have a Typescript client. Although adding additional clients is in the roadmap. (the tog-node is included to this repo as a submodule, and configured as tog-client in package.json.  for other languages, keep reading...) 
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
Assuming you have built your docker container like this: 
```
$ docker build . -t tog-management-server:latest
```
### Configuration variables
Before launching, you shall have the following environment variables set properly
* `PORT` the port this management server will be listening on
* `REDIS_URL` the Redis server address, i.e. "localhost:6379"
* `REDIS_CLUSTER` if this redis is a clust i.e. "false"
* `BASE_URL` this is the base URL where the management server can be reached (i.e. public domain name with external port), also $BASE_URL/auth/redirect need to be registered in the Azure apps registration. i.e. "http://localhost:3000"
* `TENANT_ID` this is the Azure tenant in which the app is registered i.e. "***REMOVED***"
* `CLIENT_ID` the ClientID is assigned to the app when it is registered in Azure, "***REMOVED***"
* `CLIENT_SECRET` the client secret configured in Azure app registration 
* `APP_NAME`= the name of the app registration i.e. "***REMOVED***"

### Using docker compose
You can use the included compose.yaml to launch locally:
```
$ docker compose up
```
or, 
### Using docker cli
The following example shows you how to launch it locally for testing: 
```sh
$ docker run -d -p 6379:6379 --name redis_local redis
$ REDIS_HOST=$(docker inspect redis_local --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
$ docker run -d -p 3000:3000 \
 --env "PORT=${PORT}" \
 --env "REDIS_URL=${REDIS_HOST}:6379" \
 --env "REDIS_CLUSTER=false" \
 --env "BASE_URL=${BASE_URL}" \
 --env "TENANT_ID=${TENANT_ID}" \
 --env "CLIENT_ID=${CLIENT_ID}" \
 --env "CLIENT_SECRET=${CLIENT_SECRET}" \
 --env "APP_NAME=${APP_NAME}" \
  tog-management-server
```

### deploy to kubernetes
Please make sure you have a redis instance running, and set up the REDIS_URL accordingly, then: 
```
$ kubectl apply -f ./deployment.yaml 
```

## Usage:
To use the management server, visit the root of the base_url, i.e. `http://localhost:3000`
The management server will try to validate you via your Authorization Bearer token in the header or the cookie it has assigned to you after your previous successful login. 

If you can't be authenticated, or authorized (i.e. your jwt expired), you will be automatically redirected to the login page (you can also manually force a login by going to ${BASE_URL}/auth). Please note, there is no logout, to log yourself out, please use the Azure portal, and chose logout there. 

Once you login, you should see the simple management page where you can add/update/delete flags. 
* NOTE! the UI is very simple and there aren't lots of validations and double checks, so be careful what you are doing. 

### Set "Application Namespace"
Namespace are groups of flags.  i.e. for Linepulse, we use "linepulse" (all lower case) for its namespace.  type in "linepulse" in the Application Namespace box and click [list all flags] button next to it. 
Please note, the UI does not automatically refresh this list, so you might need to click on this [list all flags] button to make sure you see the latest data (including after you make updates)

The list will look like sections, each section is one feature flag. You can click either the "edit" button to make changes to this feature, or "DELETE" button to delete a feature.  Be careful, there is no fine grained access control, so you might delete flags other people still need!!!!!  All changes are audited and logged, so while the system can't prevent you from doing damage, it sure keep track of it ;-) 

Within each feature flag section, you can see the Rollout strategies (to understand rollout strategies see below).  The first one is the default one -- it matches any sessions that uses this feature flag, but it has the lowest precedence, meaning any other strategies that are also a match would be effective over this default. 
The next several entries (if there are any) are "Audience specific" roll out strategies, these strategies only apply to sessions that match all the listed traits. 

When you clic on the edit button the current values of the respective feature flag will be populated to the Add/Edit feature section.  You can then make changes here, and click the "update" button to save the value. 

To add a new feature flag, just type a new name into the "Add/Edit feature" box.  Please note, there is no duplicate check, so if you type in a flag that already exist, you will overwrite it. 

If you need to add additional roll out strategies (i.e. turn feature on only for beta-users in Prd system) you can use the [+ Audience Specific toggle] button to add a new rollout strategy (a.k.a different audience).  Please note, you can't leave the traits box (the Audience n box) blank, because it will be conflict with the default strategy. 


## How Tog works
### Basic concepts: 
#### Application Name (or tog namespace) 
is highest level grouping, within each "Application Name", flags can only be unique strings (if you try to add a key that already exist, your new value will replace the old value).  But of course in different Applications Names, you can have flags spelled the same. 

#### A flag, (or "feature flag", or "flag key") 
is a string that uniquely (within the Application Name) identifies a feature, you can turn it on or off.  A flag has the following properties: 
* a name  (mendatory, this is how we find this feature flag)
* description (optional)
* timestampp (optional, system assigns a timestamp at the time of updating the value of this flag)
* a rollout array (mandatory, a json array of rollout-strategies), each rollout strategy can include:
* - value (mandatory boolean determines if the strategy is to enable or disable this feature)
* - percentage (optional, a number between 0 and 100, default is 100, determines if roll this out to all sessions, percentage% of sessions, or no sessions)
* - traits (optional, an array of stings limit this rollout strategy to only those sessions that match ALL traits)

i.e. a typical flag is stored internally like: 
```
{"namespace":"capmetrics","name":"a","timestamp":1665176170,"rollout":[{"value":false}, {"traits":["circle"],"value":true}]}, 
```
#### A session, 
is a self-identifying way of differentiating one user interaction from another.  Only the tog client (tog-node) care about session. For example, you open Chrome and then Firefox to visit linepulse, each of one of these two would be a separate session.  Tog uses session info to determine the percentage roll-out - based on the hash of your session id (you provide when you call the client), it determines if a feature should be on or off for you. Session is not used when the rollout policy is 100% one way or another. 

### How do rollout strateries work?
Tog-client is developed to implement the algorithm to help Sessions (i.e. front-end session, or a backend service instance) determine if they should enable a particular feature or not. 

The Session object is created with the application name (so that each subsequent calls do not repetatively refer the namespace), a session_id (typically a uuid generated for each user interaction session, but this can be any arbitary string), and traits (optional, read below on traits matching strategy)

Application Name (namespace) & Flag Name (name) combined locate the feature flag data. 

Each flag data can contain one or more rollout strategies in the rollout array. 

The simpliest case is there is only one item in the rollout array: `{"value":true}` this means this feature will be enabled for all sessions (users). 

However, it is allowed to have multiple rollout strategies in the rollout array (the example shown in previous section has 2).  

#### traits matching
For a given session, the tog-client will look for rollout strategies that have traits match the session traits. 

Only if a all the traits of a rollout strategy are found in the session traits, it is considered a match. (This means when you define rollout strategy, traits are "and" op, only sessions meet all the traits will be a match).   
Traits are comma separated string arrays.  Please note, you can't use quatation marks to make a trait name contain ",".  comma cannot be used in in trait names.  Although quotation marks technically can, howeer, because of the escape requirements, using quotation marks in trait names can be hard to predict, it might become \" instead of ". 


If multiple matches are found, the one with most number of traits will take precedence (this means the more specific a rollout strategy is, the higher it is in priority.  for example, if you have a ["big"] rollout strategy and a ["big","blue"] strategy, and your session has traits ["big","blue","circle"], both rollout stragy will match, but the ["big","blue"] will be the effective one, because it is more specific)

If multiple matches have name number of traits, than "false" one will take precedence. (this allows you to turn things off with more certainty, for example if you have 2 strategies {"value":true, traits:["big","blue"]} and {"value":false, traits:["big","circle"]}, both of them will match the same seesion example above, but the ["big","circle"] will triumph and the feature will not be available to the session because it is a big circle)

If multiple matches having same number of traits are found, the highest percentage will win out. (for example if you have 2 strategies {"value":true, percentage: 50, traits:["big","blue"]} and {"value":true, percentage: 25, traits:["big","circle"]}, both of them will match the same seesion example above, but the ["big","blue"] will triumph)

So, there are some tricks you can do here, for example, if you don't like the "false" to be the higher priority, you can actually define a strategy as {"value":true, percentage: 0, traits:["big","blue"]}.  When used individually this has the same effect as {"value":false, traits:["big","blue"]} but when multiple strategies colide, the "false" one will rank at the top while the "percentage:0" ranks at the bottom. 

It is recommended to always have a catch all strategy that has no traits specified, it will apply to all sessions that have no traits match. If there is no such strategy defined, the default will be false. 



For more info on the concept of tog, please visit [tog_spec](./tog_spec.md)

## Sample code how to use feature toggles in Typescript code: 
In the following example, I show how to insert the tog code into the ConfigService of a Nest.js repo. 
This allows any module that imports the ConfigService to simply call the tog client to retrieve the value of a flag.

```Typescript
import { FlagClient , SessionClient } from "tog-node";

@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  private sessions = new SessionClient('redis://127.0.0.1:6379', {"timeout": 30000});

  public async getFeatureFlag(key: string) : Promise<boolean> {
    const session = await this.sessions.session('capmetrics', 'session-uuid' , ["beta-tester","power-user","EN-US"]);

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
Please node this is server side code, and I just used string "session-uuid" here. you can replace it with any string you like to identify your session.  Please note if the gradual roll out is used, this session string you chose should be consistent enough so this session will always have the same id, so that the user's experience is consistent. 
I also used traits ["beta-tester","power-user","EN-US"] in this example, however, this might not be desirable in server side code (because the server side service might be serving many different requests from different users)

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

## the REST API
This tog-management-server offers both management API and client session API via REST. 
management API are protected by AAD authentication, while the client session API is public. 
### Management APIs
* get /flags/:namespace - list all feature flags of this ":namespace"
* get /flags/:namespace/:name - detail of one specific flag ":name"
* put /flags/:namespace/:name - add or update the details of flag ":name"
* delete /flags/:namespace/:name - delete the details of flag ":name"

### client session API
* get /flags/forsession/:namespace/:name?session=... - return true or false based on the matching rollout strategy

Here is an example: `http://tog-server:3000/flags/forsession/capmetrics/a?session=%7B%22namespace%22:%22capetrics%22,%22id%22:%22sess_id%22,%22traits%22:%5B%22big1%22,%22circle%22%5D%7D`

Because we do not preserve session data for REST API call, the session info is provided as the end-point query parameter "session".  it is provided as `encodeRUI(JSON.stringify({namespace:"capmetrics", id:"sess_id", traits:["big","circle"]}))`

The response is either a false or a true

Keep in mind false is the default, if there is no suitable strategy found whatsoever, this end point will return false. 
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