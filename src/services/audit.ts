//module.exports = function audit (req, resource, body) {
const audit = (req: any, resource: any, body:any) => {
    const user=((req.user != null) ? req.user : "someone") + " from " + req.client.remoteAddress + ":" + req.client.remotePort;
    req.log.child({
    category: 'audit',
    resource,
    action: req.method,
    user: user,
    body
  }).info(`Audit: ${user} performed ${req.method} on ${resource}`)
}
export default audit;