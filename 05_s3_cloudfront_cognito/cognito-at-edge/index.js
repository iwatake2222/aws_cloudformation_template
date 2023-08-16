const { Authenticator } = require('cognito-at-edge');

const authenticator = new Authenticator({
  // Replace these parameter values with those of your own environment
  region: 'ap-northeast-1', // user pool region
  userPoolId: 'ap-northeast-1_tyo1a1FHH', // user pool ID
  userPoolAppId: '63gcbm2jmskokurt5ku9fhejc6', // user pool app client ID
  userPoolDomain: 'domain.auth.ap-northeast-1.amazoncognito.com', // user pool domain
});

exports.handler = async (request) => authenticator.handle(request);
