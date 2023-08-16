AWS CloudFormation: 04. S3 (+ CloudFront) による静的ウェブサイトのホスティング

# 本記事について

- AWS CloudFormationを用いて、色々なアーキテクチャを構築していきます
- 本記事では、S3を用いて静的ウェブサイトのホスティングを、以下の2つの方法で行います
  - S3の静的ウェブサイトホスティング機能による公開
  - S3をオリジンとして、CloudFront + OAC (Origin Access Control) による公開
- [最新テンプレートはGitHubに配置しています](https://github.com/iwatake2222/aws_cloudformation_template)

# S3の静的ウェブサイトホスティング

## 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/3d6e1c17-d26e-4063-3e4b-9d60562e1e13.png)

- まず、S3バケットを作成します
  - バケット名は `${OrganizationName}-${SystemName}-bucket` とします
    - S3バケット名はグローバル名前空間内でユニークである必要があります。そのため、プリフィックスに組織名をつけています
  - `PublicAccessBlockConfiguration` 内の全ての設定をfalseにすることで、ブロックパブリックアクセスを全て許可します
  - また、`WebsiteConfiguration` を設定することで、静的ウェブサイトホスティング機能を有効にします
- 次に、S3バケットポリシーを作成します
  - `Principal: '*'` に対して、`s3:GetObject` 権限を付与します。これによって、誰でもオブジェクトを参照可能とします

## 作成するリソース
- S3バケット関連
    - AWS::S3::Bucket
    - AWS::S3::BucketPolicy

## デプロイ方法

### 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

### デプロイコマンド

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-04-a

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-s3-hosting \
--template-file ./s3-hosting.yaml \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

上記コマンドでデプロイした後、下記コマンドで適当にindex.htmlをアップロードします

```sh
echo hello > index.html
aws s3 cp index.html s3://"${OrganizationName}-${SystemName}-bucket"
```

## 動作確認

- URLは、 `http://"${OrganizationName}-${SystemName}-bucket".s3-website-ap-northeast-1.amazonaws.com` になります
- ブラウザからアクセスして、index.htmlのコンテンツが表示されればOKです

## テンプレート

- デプロイコマンド実行時、以下のファイルを `s3-hosting.yaml` として配置してください

```yaml:s3-hosting.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create an S3 bucket for hosting a static website

Parameters:
  OrganizationName:
    Description: Organization Name
    Type: String
  SystemName:
    Description: System Name
    Type: String

Resources:
  #-----------------------------------------------------------------------------
  # S3 bucket
  #-----------------------------------------------------------------------------
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${OrganizationName}-${SystemName}-bucket
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        IgnorePublicAcls: false
        BlockPublicPolicy: false
        RestrictPublicBuckets: false
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: error.html
      Tags:
        - Key: Name
          Value: !Sub ${OrganizationName}-${SystemName}-bucket

  S3BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref S3Bucket
      PolicyDocument:
        Version: 2012-10-17
        Statement:
          - Action:
              - s3:GetObject
            Effect: Allow
            Resource:
              - !Sub arn:aws:s3:::${S3Bucket}/*
            Principal: '*'
```

# S3をオリジンとした、CloudFront + OAC (Origin Access Control)

## 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/c8662e65-d8cf-c85f-8f3b-65cefe60a04f.png)

- 続いて、CloudFront経由で公開する方法を試します。S3とCloudFrontを繋ぐため、従来はOrigin Access Identity (OAI) というものが用いられていましたが、現在は非推奨となっているようです。ここでは、Origin Access Control（OAC）を使用します
- まず、S3バケットを作成します
  - バケット名は `${OrganizationName}-${SystemName}-bucket` とします
    - S3バケット名はグローバル名前空間内でユニークである必要があります。そのため、プリフィックスに組織名をつけています
    - S3バケットそのものに対して特別な設定は不要です
- 次に、S3バケットポリシーを作成します
  - 後で作成するCloudFront Distributionに対して、`s3:GetObject` 権限を付与します。これによって、CloudFront Distributionのオリジンとして、コンテンツを提供可能となります
- 次に、CloudFront Distributionを作成します
  - オリジンとして、先ほど作成したS3バケットを指定します
  - OAIは使用しないので空を指定し、OACは後で作成するものを指定します
  - その他キャッシュ関係の挙動を指定します。これらは必要に応じて変更してください
- 最後に、OriginAccessControlを作成します

## 作成するリソース
- S3バケット関連
  - AWS::S3::Bucket
  - AWS::S3::BucketPolicy
- CloudFront関連
  -  AWS::CloudFront::Distribution
  - AWS::CloudFront::OriginAccessControl

## デプロイ方法

### 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

### デプロイコマンド

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-04-b

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-s3-cloudfront \
--template-file ./s3-cloudfront.yaml \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

CloudFrontが有効になるのに時間がかかるため、デプロイには数分時間がかかります

上記コマンドでデプロイした後、下記コマンドで適当にindex.htmlをアップロードします

```sh
echo hello > index.html
aws s3 cp index.html s3://"${OrganizationName}-${SystemName}-bucket"
```

## 動作確認

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/bfe3a060-6324-1e5a-5b47-33835447ca60.png)

- URLは、AWS Console -> CloudFront -> Distribution -> 作成した ディストリビューションの `ドメイン名` に、`https://` を付けたものになります
    - ↑の図の場合は、https://d2xrldc2i3vvkq.cloudfront.net
- ドメイン名はテンプレートからも出力しているため、下記コマンドでも確認出来ます

```sh
aws cloudformation describe-stacks --stack-name "${SystemName}"-s3-cloudfront --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" --output text
```

- `https://ドメイン名.net` にブラウザからアクセスして、index.htmlのコンテンツが表示されればOKです
    - index.htmlを配置していないと `AccessDenied` エラーになるので注意してください

## テンプレート

- デプロイコマンド実行時、以下のファイルを `s3-cloudfront.yaml` として配置してください

```yaml:s3-cloudfront.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create an S3 bucket and CloudFront (OAC) for hosting a static website

Parameters:
  OrganizationName:
    Description: Organization Name
    Type: String
  SystemName:
    Description: System Name
    Type: String

Resources:
  #-----------------------------------------------------------------------------
  # S3 bucket
  #-----------------------------------------------------------------------------
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${OrganizationName}-${SystemName}-bucket
      Tags:
        - Key: Name
          Value: !Sub ${OrganizationName}-${SystemName}-bucket

  S3BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref S3Bucket
      PolicyDocument:
        Version: 2012-10-17
        Statement:
          - Action:
              - s3:GetObject
            Effect: Allow
            Resource:
              - !Sub arn:aws:s3:::${S3Bucket}/*
            Principal:
              Service: cloudfront.amazonaws.com
            Condition:
              StringEquals:
                AWS:SourceArn: !Sub arn:aws:cloudfront::${AWS::AccountId}:distribution/${CloudFrontDistribution}

  #-----------------------------------------------------------------------------
  # CloudFront
  #-----------------------------------------------------------------------------
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Comment: !Sub ${SystemName}-distribution
        Origins:
          - DomainName: !GetAtt S3Bucket.RegionalDomainName
            Id: S3Origin
            OriginAccessControlId: !GetAtt OAC.Id
            S3OriginConfig:
              OriginAccessIdentity: ''
        Enabled: true
        DefaultRootObject: index.html
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          Compress: true
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6  # CachingOptimized (Recommended for S3)
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
          CachedMethods:
            - GET
            - HEAD
        PriceClass: PriceClass_All

  OAC:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Description: Access Control
        Name: !Sub ${SystemName}-oac
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4


Outputs:
  CloudFrontDomainName:
    Value: !GetAtt CloudFrontDistribution.DomainName
    Export:
      Name: !Sub ${SystemName}-domain-name
```
