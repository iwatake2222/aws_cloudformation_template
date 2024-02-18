# Create an S3 bucket for hosting item list

- Create index.html to list dirs under top
- Create index.html to list items unde each dir

```
bucket_name/
├── dir_1
│   ├── item_1
│   └── item_2
├── dir_2
└── dir_n
```

## How to run

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

zip index.zip index.py
aws lambda update-function-code \
--function-name "${SystemName}"-lambda \
--zip-file fileb://index.zip
rm index.zip
```

## How to test

```sh
mkdir temp_dir
mkdir temp_dir/sub_dir
echo "hoge" > temp_dir/file_hoge
echo "fuga" > temp_dir/file_fuga
echo "sub_hoge" > temp_dir/sub_dir/file_sub_hoge
aws s3 cp --recursive temp_dir s3://"${OrganizationName}-${SystemName}-bucket"/temp_dir
rm -rf  temp_dir
```

```sh
aws cloudformation describe-stacks --stack-name "${SystemName}"-s3-list-hosting --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" --output text
curl https://oooooooooooooo.cloudfront.net
```
