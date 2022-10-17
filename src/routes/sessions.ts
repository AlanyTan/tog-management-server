import  express  from 'express';
import { FlagNotFoundError , SessionClient  } from 'tog-client';
import {appConfig} from '../services/config';
//import  audit  from '../services/audit';
//import { validateJwt} from './auth_aad';


const sessionClient = new SessionClient(appConfig.redisUrl, { cluster: appConfig.isRedisCluster })



const sessions = express.Router()
  .get('/:namespace', async (req:any, res:any, next) => {
    const { namespace } = req.params;
    let session:any;
    if ( req.query?.session == null ) {
      res.status(400).json({message:"no valid session data provided."});
    } else {
      session=JSON.parse(decodeURI((typeof req.query["session"] === "string" ) ? req.query["session"] : "" ));
    }
    try {
      const sessionRes = await sessionClient.session(namespace, session.id, session.traits);
      try {
        res.status(200).json(sessionRes);
      } catch (err) {
        res.status(400).json({ message: "session data is not properly encoded or stringified." + err });

      }
    } catch (err_1) {
      return err_1.name === FlagNotFoundError.name
        ? res.status(404).json({ message: 'namespace not found' })
        : next(err_1);
    }
    // to generate a test query value: console.log("session=" + encodeURI(JSON.stringify({namespace:"capmetrics", id:"sess_id", traits:["big","circle"]})))
  })


  .get('/:namespace/:name', async (req:any, res:any, next) => {
    const { namespace, name } = req.params;
    let session:any;
    if ( req.query?.session == null ) {
      res.status(400).json({message:"no valid session data provided."});
    } else {
      session=JSON.parse(decodeURI((typeof req.query["session"] === "string" ) ? req.query["session"] : "" ));
    }
    try {
      const sessionRes = await sessionClient.session(namespace, session.id, session.traits);
      try {
        res.status(200).json(sessionRes.flags[name]);
      } catch (err) {
        res.status(400).json({ message: "session data is not properly encoded or stringified." + err });

      }
    } catch (err_1) {
      return err_1.name === FlagNotFoundError.name
        ? res.status(404).json({ message: 'namespace not found' })
        : next(err_1);
    }
    // to generate a test query value: console.log("session=" + encodeURI(JSON.stringify({namespace:"capmetrics", id:"sess_id", traits:["big","circle"]})))
  })

export default sessions;

const quit = () => {
  sessionClient.redis.quit();
};

export {quit};
