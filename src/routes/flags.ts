import  express  from 'express';
import { FlagClient, FlagNotFoundError   } from 'tog-client';
import  bodyParser  from 'body-parser'
import  Joi  from '@hapi/joi';
import {appConfig} from '../services/config';
import  audit  from '../services/audit';
import { validateJwt} from './auth_aad';


const flagClient = new FlagClient(appConfig.redisUrl, { cluster: appConfig.isRedisCluster })

const schema = Joi.object().keys({
  description: Joi.string(),
  rollout: Joi.array().items(
    Joi.object().keys({
      value: Joi.boolean().required(),
      percentage: Joi.number().min(0).max(100),
      traits: Joi.array().items(Joi.string())
    })
  )
})
//module.exports = express.Router().use(authenticate)

// module.exports = express.Router()
const flags = express.Router()
  .get('/:namespace', validateJwt, (req, res, next) => {
    return flagClient.listFlags(req.params.namespace)
      .then(flags => res.status(200).json(flags))
      .catch(next)
  })

  .get('/:namespace/:name', validateJwt, (req, res, next) => {
    const { namespace, name } = req.params
    return flagClient.getFlag(namespace, name)
      .then(flag => res.status(200).json(flag))
      .catch(err =>
        err.name === FlagNotFoundError.name
          ? res.status(404).json({ message: 'flag not found' })
          : next(err)
      )
  })

  .put('/:namespace/:name', validateJwt, bodyParser.json(), (req, res, next) => {


    const { namespace, name } = req.params
    const val = schema.validate(req.body)
    if (val.error) {
      return res.status(422).json(val.error)
    }

    const flag = {
      name,
      namespace,
      rollout: req.body.rollout,
      description: req.body.description
    }

    return flagClient.saveFlag(flag)
      .then(() => res.status(200).json(flag))
      .then(() => audit(req, flag.namespace + '/' + flag.name, flag))
      .catch(next)
  })

  .delete('/:namespace/:name', validateJwt, (req, res, next) => {
    const { namespace, name } = req.params

    return flagClient.deleteFlag(namespace, name)
      .then(deleted => deleted
        ? res.status(204).end()
        : res.status(404).json({ message: 'flag not found' }))
  });

export default flags;

const quit = () => {
  flagClient.redis.quit();
};

export {quit};
