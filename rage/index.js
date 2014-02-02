module.exports = function(config) {
   require("./" + config.type)(config); 
}