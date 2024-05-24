# Create an EC2 and connect using SSM and EC2 Instance Connect (EIC)

## AWS Architecture

### EC2 in a Public Subnet

![](./ec2_ssm_eic_public.drawio.png)

### EC2 in a Private Subnet

![](./ec2_ssm_eic_private.drawio.png)

## How to run

- Select `SystemName` and `TemplateFileName` according to whether you want to place EC2 in a public subnet or in a private subnet

```sh
Region=ap-northeast-1
AvailabilityZone=ap-northeast-1a

SystemName=sample-ec2-ssm-eic-public
TemplateFileName=./ec2_ssm_eic_public.yaml

# SystemName=sample-ec2-ssm-eic-private
# TemplateFileName=./ec2_ssm_eic_private.yaml

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}" \
--template-file ${TemplateFileName} \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
SystemName="${SystemName}" \
AvailabilityZone="${AvailabilityZone}"
```

## How to connect to an EC2

- Install SessionManagerPlugin

### Easy test

```
aws ssm start-session --target i-00000000000000000
```

### SSH

- Configure `~/.ssh/config`
  - Push SSH key, then start ssh session

```
# ~/.ssh/config
Host i-* mi-*
    ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_rsa.pub' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"

# (Optional) To specify host id
Host ec2-server
    HostName i-00000000000000000
    User ubuntu
    ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_rsa.pub' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

- (Optional) For Windows
  - Replace 
    - `sh -c`
    - `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`

- Connect

```
ssh ubuntu@i-00000000000000000

ssh ec2-server
```
