AWS CloudFormation: 03. S3バケットの作成とポリシー・アクセス許可の設定

# 本記事について

- AWS CloudFormationを用いて、色々なアーキテクチャを構築していきます。テンプレートのコピペ元としてご活用いただければ幸いです
  - [01. 仮想ネットワークの構築](https://qiita.com/iwatake2222/items/d19bd983391a292345af)
  - [02. アプリケーションサーバーの構築と踏み台サーバー経由でのアクセス方法](https://qiita.com/iwatake2222/items/45822e5ef9b56df42069)
  - [03. S3バケットの作成とポリシー・アクセス許可の設定](https://qiita.com/iwatake2222/items/d9c977e740ec1ee16b9c)
  - [04. S3 (+ CloudFront + OAC) による静的ウェブサイトのホスティング](https://qiita.com/iwatake2222/items/ac4392c11f83af2f320a)
  - [05. S3 + CloudFront + Cognito + Lambda@Edge による認証機能付き静的ウェブサイトのホスティング](https://qiita.com/iwatake2222/items/998d77951b7044e9bbbf)
  - [06. Lambda関数を作成して、S3/EventBridge/SQS から呼び出す](https://qiita.com/iwatake2222/items/e6eed5301e807e1a685d)
- [最新テンプレートはGitHubに配置しています](https://github.com/iwatake2222/aws_cloudformation_template)
- 本記事では、S3バケットを作成します。そして、そのS3バケットへのポリシー・アクセス許可の設定を以下の2パターンで行います
  - S3バケットポリシーによる設定
  - IAM ポリシーによる設定

# S3バケットポリシーによる設定

## 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/dd54be84-6028-072e-3332-f769be78edf1.png)

- まず、S3バケットを作成します
  - バケット名は `${OrganizationName}-${SystemName}-bucket` とします
  - ついでに、サンプルとして、Intelligent Tieringの設定をしています。これによって、コスト削減を見込めます。不要ならこの設定は削除してください
    - アップロードされたら即、ストレージクラスをINTELLIGENT_TIERINGに移行します
    - INTELLIGENT_TIERINGのルールとして、最終アクセスから半年後にARCHIVE、1年後にDEEP ARCHIVEのアクセス階層に自動的に移行するようにします
- 次に、S3バケットポリシーを作成します
  - 適当なIAM Roleに対してアクセス権を付与しています
    - ロール名は `${SystemName}-s3-access-role` とします
- 最後に、動作確認のためにここではIAM Roleも作成しています
  - このロールに対しては、特に何の設定も行いません
  - 作成したIAM RoleをEC2インスタンスに割り当て可能にするために、AWS::IAM::InstanceProfileも作成しています
  - 新規に作成せずに既存のIAM Roleに付与することも可能ですが、S3バケットポリシー作成時にそのIAM Roleを参照出来る必要があります

## 作成するリソース
- S3バケット関連
    - AWS::S3::Bucket
    - AWS::S3::BucketPolicy
- テスト用のIAMロール
    - AWS::IAM::Role
    - AWS::IAM::InstanceProfile
- その他
  - 動作確認のために適当なEC2を作りますが、CloudFormationではなくAWSコンソール上で作成します
  - また、デフォルトVPCを使うため、事前のネットワーク設定は不要です

## 構築方法

### 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

### 構築コマンド

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-03-a

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-s3-permitted-by-bucket-policy \
--template-file ./s3-permitted-by-bucket-policy.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

- S3バケットはAWS全体としてユニークである必要があります。そのため、プリフィックスに組織名をつけています

## 接続確認

### 自分のPCからの接続確認

- 自分のPCから下記のようなコマンドで、S3バケットが作成されたことを確認できます
- 自分のPCからアクセスすると、バケットの所有者としてのアクセスとなります。そのため、何の設定をしないでもデフォルトでアクセス可能となります

```sh:自分のPC
OrganizationName=iwatake2222
SystemName=sample-03-a
dd if=/dev/zero of=dummy_file bs=1M count=100
aws s3 cp dummy_file s3://"${OrganizationName}-${SystemName}-bucket"
aws s3 ls s3://"${OrganizationName}-${SystemName}-bucket"
```

### 権限付与したIAMロールからの接続確認

- S3バケットポリシーで権限付与したIAMロールでアクセスできることを確認するため、適当なEC2インスタンスを作り、ブラウザから簡単にログインします
  - AWSコンソール -> EC2 -> インスタンス -> インスタンスを起動 -> 適当な設定 (VPCはデフォルトでOK。SGは作成する(sshを受け付けるため)。キーペアは面倒なら作成不要)
  - 作成したインスタンスを右クリック -> 接続 -> EC2 Instance Coneect -> 接続
- その後、下記コマンドでS3にアクセスしてみます
- が、失敗するはずです。これは、このEC2インスタンスが、作成したS3バケットにアクセスする権限を持っていないためです

```sh:EC2上のターミナル
OrganizationName=iwatake2222
SystemName=sample-03-a
aws s3 ls s3://"${OrganizationName}-${SystemName}-bucket"
```

- 以下の操作で、このEC2インスタンスに先ほど作成したIAM Roleを割り当てます
  - AWSコンソール -> EC2 -> インスタンス -> 作成したインスタンスを右クリック -> セキュリティ -> IAM ロールを変更
  - 作成したIAM ロール (sample-03-a-s3-access-role) を選ぶ
  - デフォルトだと何のIAM ロールも割当たっていません
- この状態で再度S3バケットへアクセスすると、アップロードした `dummy_file` を見ることが出来るはずです
  - 万が一失敗する場合は、少し待つか、EC2インスタンスを再起動してみてください

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/7afad923-1d99-2596-06f7-72da57e30e6a.png)

## テンプレート

- 構築コマンド実行時、以下のファイルを `s3-permitted-by-bucket-policy.yaml` として配置してください

```yaml:s3-permitted-by-bucket-policy.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create an S3 bucket

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
      LifecycleConfiguration:
        Rules:
          - Id: IntelligentTierRule
            Status: Enabled
            Transitions:
              - TransitionInDays: 0
                StorageClass: INTELLIGENT_TIERING
      IntelligentTieringConfigurations:
        - Id: DeepArchiveConfig
          Status: Enabled
          Tierings:
            - AccessTier: ARCHIVE_ACCESS
              Days: 180
            - AccessTier: DEEP_ARCHIVE_ACCESS
              Days: 365
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
              - s3:PutObject
              - s3:ListBucket
              - s3:DeleteObject
              - s3:GetBucketLocation
            Effect: Allow
            Resource:
              - !Sub arn:aws:s3:::${S3Bucket}
              - !Sub arn:aws:s3:::${S3Bucket}/*
            Principal:
              AWS:
                - !GetAtt S3AccessRole.Arn

  #-----------------------------------------------------------------------------
  # IAM Role to access S3 Bucket
  #-----------------------------------------------------------------------------
  S3AccessRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${SystemName}-s3-access-role
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - ec2.amazonaws.com
            Action:
              - sts:AssumeRole

  S3AccessInstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles: 
        - !Ref S3AccessRole
```

# IAM ポリシーによる設定

## 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/2100c706-8953-1da4-e81c-e7211f32d16c.png)

- まず、S3バケットを作成します
  - バケット名は `${OrganizationName}-${SystemName}-bucket` とします
  - ついでに、サンプルとして、Intelligent Tieringの設定をしています。これによって、コスト削減を見込めます。不要ならこの設定は削除してください
    - アップロードされたら即、ストレージクラスをINTELLIGENT_TIERINGに移行します
    - INTELLIGENT_TIERINGのルールとして、最終アクセスから半年後にARCHIVE、1年後にDEEP ARCHIVEのアクセス階層に自動的に移行するようにします
- 次に、IAMポリシーを作成します
    - ポリシー名は `${SystemName}-s3-access-policy` とします
    - このポリシーに対して、先ほど作成したS3バケットへのアクセス権を付与します
    - 必要に応じて、IAMロールも作成して、このポリシーを割り当ててください
    - なお、ポリシーはAWS::IAM::Policyではなく、AWS::IAM::ManagedPolicyとします。AWS::IAM::Policyだとインラインポリシーとなり、後から任意のIAMロールへ割り当てることが出来ないためです

## 作成するリソース
- S3バケット関連
    - AWS::S3::Bucket
- IAMポリシー
    - AWS::IAM::ManagedPolicy
- その他
  - 動作確認のために適当なEC2を作りますが、CloudFormationではなくAWSコンソール上で作成します
  - また、デフォルトVPCを使うため、事前のネットワーク設定は不要です

## 構築方法

### 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

### 構築コマンド

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-03-b

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-s3-permitted-by-iam-policy \
--template-file ./s3-permitted-by-iam-policy.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

- S3バケットはAWS全体としてユニークである必要があります。そのため、プリフィックスに組織名をつけています

## 接続確認

### 自分のPCからの接続確認

- 自分のPCから下記のようなコマンドで、S3バケットが作成されたことを確認できます
- 自分のPCからアクセスすると、バケットの所有者としてのアクセスとなります。そのため、何の設定をしないでもデフォルトでアクセス可能となります

```sh:自分のPC
OrganizationName=iwatake2222
SystemName=sample-03-b
dd if=/dev/zero of=dummy_file_b bs=1M count=100
aws s3 cp dummy_file_b s3://"${OrganizationName}-${SystemName}-bucket"
aws s3 ls s3://"${OrganizationName}-${SystemName}-bucket"
```

### 権限付与したIAMポリシーからの接続確認

- まず、先ほど作成した動作確認用のEC2インスタンスから下記コマンドでS3にアクセスしてみます
- すると、今はまだアクセスに失敗するはずです。理由は、このインスタンスは今作成したS3バケットへのアクセス権が付与されていないためです

```sh:EC2上のターミナル
OrganizationName=iwatake2222
SystemName=sample-03-b
aws s3 ls s3://"${OrganizationName}-${SystemName}-bucket"
```

- 以下の操作で、EC2インスタンスが割り当てられているIAMロールに、作成したIAMポリシーを割り当てます
  - AWSコンソール -> EC2 -> インスタンス -> 作成したインスタンスを選択 -> セキュリティタブ -> IAM ロール (先ほど設定した `sample-03-a-s3-access-role` になっているはず) をクリック
  - IAMロールの設定画面が開いたら、許可を追加 -> ポリシーをアタッチ -> `sample-03-b-s3-access-policy` を選択 -> 許可を追加
- この状態で再度S3バケットへアクセスすると、アップロードした `dummy_file_b` を見ることが出来るはずです
  - 万が一失敗する場合は、少し待つか、EC2インスタンスを再起動してみてください

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/2537dfdc-def1-8c24-44da-9e33cb310a08.png)

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/98e91848-6716-38e8-d58c-3c5078842892.png)

## テンプレート

- 構築コマンド実行時、以下のファイルを `s3-permitted-by-iam-policy.yaml` として配置してください

```yaml:s3-permitted-by-iam-policy.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create an S3 bucket

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
      LifecycleConfiguration:
        Rules:
          - Id: IntelligentTierRule
            Status: Enabled
            Transitions:
              - TransitionInDays: 0
                StorageClass: INTELLIGENT_TIERING
      IntelligentTieringConfigurations:
        - Id: DeepArchiveConfig
          Status: Enabled
          Tierings:
            - AccessTier: ARCHIVE_ACCESS
              Days: 180
            - AccessTier: DEEP_ARCHIVE_ACCESS
              Days: 365
      Tags:
        - Key: Name
          Value: !Sub ${OrganizationName}-${SystemName}-bucket

  #-----------------------------------------------------------------------------
  # IAM Policy to access S3 Bucket
  #-----------------------------------------------------------------------------
  S3AccessPolicy:
    Type: AWS::IAM::ManagedPolicy
    Properties:
      ManagedPolicyName: !Sub ${SystemName}-s3-access-policy
      PolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Action: 
              - s3:GetObject
              - s3:PutObject
              - s3:ListBucket
              - s3:DeleteObject
              - s3:GetBucketLocation
            Resource: 
              - !Sub arn:aws:s3:::${S3Bucket}
              - !Sub arn:aws:s3:::${S3Bucket}/*

  # S3AccessRole:
  #   Type: AWS::IAM::Role
  #   Properties:
  #     RoleName: !Sub ${SystemName}-s3-access-role
  #     AssumeRolePolicyDocument:
  #       Version: 2012-10-17
  #       Statement:
  #         - Effect: "Allow"
  #           Principal:
  #             Service:
  #               - "ec2.amazonaws.com"
  #           Action:
  #             - "sts:AssumeRole"
  #     ManagedPolicyArns:
  #       - !Ref S3AccessPolicy

  # S3AccessInstanceProfile:
  #   Type: AWS::IAM::InstanceProfile
  #   Properties:
  #     Roles: 
  #       - !Ref S3AccessRole
```
