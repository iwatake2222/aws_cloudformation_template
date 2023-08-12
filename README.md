# AWS CloudFormation template

## Pre-requisite

- Create an IAM User and create an Access Key in AWS Console
- Install AWS CLI version 2 in your PC

```
# ~/.aws/config
[default]
region = ap-northeast-1
output = json
```

```
# ~/.aws/credentials
[default]
aws_access_key_id = ooo
aws_secret_access_key = ooo
```

- Generate ssh key

```sh
ssh-keygen
```

- (Optional) Instal lsession manager

```sh
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```
