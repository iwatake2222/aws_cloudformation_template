# Create an application server

## AWS Architecture to be created

![](./application-server.drawio.png)

## How to run

[01_virtual_network](../01_virtual_network) needs to be created beforehand

```sh
Region=ap-northeast-1
SystemName=sample
AvailabilityZone=ap-northeast-1a

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-app-server \
--template-file ./application-server.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
SystemName="${SystemName}" \
AvailabilityZone="${AvailabilityZone}"
```

## How to connect to an application server via a bastion server

- Replace ooo (hostname and instance id)
    - Hostname in aws_bastion: Public IPv4 Address of BastionInstance
    - Hostname in aws_app: Private IPv4 Address of ApplicationInstance

```
# ~/.ssh/config
Host aws_bastion
    Hostname ooo.ooo.ooo.ooo
    User ec2-user

Host aws_app
    Hostname 10.0.16.ooo
    User ec2-user
    ProxyCommand ssh aws_bastion -W %h:%p

host i-* mi-*
    ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

```
AvailabilityZone=ap-northeast-1a
AWS_BASTION_ID=i-ooo
AWS_APP_ID=i-ooo 

aws ec2-instance-connect send-ssh-public-key \
--instance-id "${AWS_BASTION_ID}" \
--availability-zone "${AvailabilityZone}" \
--instance-os-user ec2-user \
--ssh-public-key file://~/.ssh/id_rsa.pub

aws ec2-instance-connect send-ssh-public-key \
--instance-id "${AWS_APP_ID}" \
--availability-zone "${AvailabilityZone}" \
--instance-os-user ec2-user \
--ssh-public-key file://~/.ssh/id_rsa.pub

# ssh aws_bastion
#  or
ssh aws_app
```
