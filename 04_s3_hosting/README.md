# Create an S3 bucket for hosting a static website

## AWS Architecture to be created

![](./s3-hosting.drawio.png)

- S3 Bucket for hosting a static website
    - AWS::S3::Bucket
    - AWS::S3::BucketPolicy

## How to run

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-s3-hosting \
--template-file ./s3-hosting.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"

echo hello > index.html
aws s3 cp index.html s3://"${OrganizationName}-${SystemName}-04-bucket"

curl http://"${OrganizationName}-${SystemName}-04-bucket".s3-website-ap-northeast-1.amazonaws.com/
```
