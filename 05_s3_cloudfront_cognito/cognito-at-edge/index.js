const { Authenticator } = require('cognito-at-edge');

const authenticator = new Authenticator({
  // Replace these parameter values with those of your own environment
  region: 'us-east-1', // user pool region
  userPoolId: 'us-east-1_tyo1a1FHH', // user pool ID
  userPoolAppId: '63gcbm2jmskokurt5ku9fhejc6', // user pool app client ID
  userPoolDomain: 'domain.auth.us-east-1.amazoncognito.com', // user pool domain
});

exports.handler = async (request) => authenticator.handle(request);
