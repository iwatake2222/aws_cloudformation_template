
```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-09

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-s3-list-hosting \
--template-file ./s3-list-hosting.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"

echo hello > index.html
aws s3 cp index.html s3://"${OrganizationName}-${SystemName}-bucket"

aws cloudformation describe-stacks --stack-name "${SystemName}"-s3-list-hostnig --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" --output text

curl https://oooooooooooooo.cloudfront.net
```
