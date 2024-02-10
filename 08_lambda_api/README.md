# Create a lambda function and API

## AWS Architecture to be created

![](./lambda-s3.drawio.png)

- Lambda Function
    - AWS::Lambda::Function
    - AWS::IAM::Role
    - AWS::Lambda::Permission
    - AWS::S3::Bucket
    - AWS::Events::Rule

## How to run

```sh
Region=ap-northeast-1
SystemName=sample-07

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-lambda-api \
--template-file ./lambda-api.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
SystemName="${SystemName}"
```

## How to test

```sh
touch dummy
aws s3 cp dummy s3://"${OrganizationName}-${SystemName}-bucket"
```

- AWS Console -> CloudWatch -> Log Group -> /aws/lambda/${SystemName}


## Reference

- https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/79#issuecomment-1012457735
