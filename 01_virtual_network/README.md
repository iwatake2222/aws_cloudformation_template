# Create a virtual network

## AWS Architecture to be created

![](./virtual-network.drawio.png)

## How to run

```sh
Region=ap-northeast-1
SystemName=sample
AvailabilityZone=ap-northeast-1a

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-virtual-network \
--template-file ./virtual-network.yaml \
--parameter-overrides \
SystemName="${SystemName}" \
AvailabilityZone="${AvailabilityZone}"
```
