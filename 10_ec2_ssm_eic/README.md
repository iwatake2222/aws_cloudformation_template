# Create an EC2 and connect using SSM and EC2 Instance Connect (EIC)

```sh
Region=ap-northeast-1
SystemName=sample-ec2-ssm-eic
AvailabilityZone=ap-northeast-1a

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}" \
--template-file ./ec2_ssm_eic.yaml \
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

```
# ~/.ssh/config
host i-* mi-*
    ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"

# (Optional) For Windows
host i-* mi-*
    ProxyCommand C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters portNumber=%p"

# (Optional) To desctibe host id
Host sample
    HostName i-00000000000000000
    ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

- Send SSH key using EC2 Instance Connect (EIC)

```
INSTANCE_Id=i-00000000000000000
USER=ubuntu
aws ec2-instance-connect send-ssh-public-key \
--instance-id "${INSTANCE_Id}" \
--instance-os-user "${USER}" \
--ssh-public-key file://~/.ssh/id_rsa.pub
```

- Connect

```
ssh ubuntu@i-00000000000000000

ssh ubuntu@sample
```
