AWS CloudFormation: 06. Lambda関数を作成して、S3/EventBridge/SQS から呼び出す

# 本記事について

- AWS CloudFormationを用いて、色々なアーキテクチャを構築していきます。テンプレートのコピペ元としてご活用いただければ幸いです
  - [01. 仮想ネットワークの構築](https://qiita.com/iwatake2222/items/d19bd983391a292345af)
  - [02. アプリケーションサーバーの構築と踏み台サーバー経由でのアクセス方法](https://qiita.com/iwatake2222/items/45822e5ef9b56df42069)
  - [03. S3バケットの作成とポリシー・アクセス許可の設定](https://qiita.com/iwatake2222/items/d9c977e740ec1ee16b9c)
  - [04. S3 (+ CloudFront + OAC) による静的ウェブサイトのホスティング](https://qiita.com/iwatake2222/items/ac4392c11f83af2f320a)
  - [05. S3 + CloudFront + Cognito + Lambda@Edge による認証機能付き静的ウェブサイトのホスティング](https://qiita.com/iwatake2222/items/998d77951b7044e9bbbf)
  - [06. Lambda関数を作成して、S3/EventBridge/SQS から呼び出す](https://qiita.com/iwatake2222/items/e6eed5301e807e1a685d)
- [最新テンプレートはGitHubに配置しています](https://github.com/iwatake2222/aws_cloudformation_template)
- 本記事では、Lambda関数を作成し、以下の3つの方法で呼び出します
  - S3へのアップロードをトリガーとして呼び出す
  - S3へのアップロードをトリガーとして、EventBridge経由で呼び出す
  - S3へのアップロードをトリガーとして、SQS経由で呼び出す

# S3へのアップロードをトリガーとして呼び出す

## 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/b27715b9-f728-ecc7-e53d-a6fa6d7e7c95.png)

- まず、Lambda関数用のIAMロールを作成します
  - Lambda用に基本的な `AWSLambdaBasicExecutionRole` を付与し、それ以外は特に何も設定しません
- 次に、Lambda関数を作成します
  - python3.10をランタイムとし、適当なコードをテンプレート内に埋め込んでいます (簡単のため)
  - また、サンプルとして、環境変数経由でテンプレート内のパラメータを渡すコードも書いていますが、特に意味はありません
- 次に、Lambda関数がS3から呼び出される (invokeされる) ことを許可するように、Lambda::Permissionを作成します
  - Lambda関数が呼び出されない場合は、大体この設定を忘れていることが多いと思います
  - 注意点
    - `SourceArn` としてS3バケットのarnを指定しています。が、ここで `!Ref` を使うと後で作成するS3バケットと循環参照になってしまうので、バケット名からarnの文字列を作成しています
    - これがないとデプロイ時にエラーが出ます
- 最後に、S3バケットを作成します
  - `NotificationConfiguration` -> `LambdaConfigurations` を指定して、オブジェクトが作られたときに先ほど作成したLambda関数を呼び出すように設定しています
  - 注意点
    - S3バケットの設定をするためには、事前にLambda関数が作られている必要があります。そのため、`DependsOn: LambdaFunction` を追加しています
    - これがないとデプロイ時にエラーが出ます

## 作成するリソース
- Lambda関連
  - AWS::IAM::Role
  - AWS::Lambda::Function
  - AWS::Lambda::Permission
- S3バケット関連
  - AWS::S3::Bucket


## デプロイ方法

### 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

### デプロイコマンド

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-06-a

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-lambda-s3 \
--template-file ./lambda-s3.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

## 動作確認

- 下記コマンドによって、適当なファイルをS3バケットへアップロードします

```sh
touch dummy
aws s3 cp dummy s3://"${OrganizationName}-${SystemName}-bucket"
```

- その後、Lambdaのログを確認します。場所は以下の通りです
  - AWS Console -> CloudWatch -> Log Group -> /aws/lambda/${SystemName}
  - (ロググループの下に関数が存在しない場合は、正しいリージョンにいるかどうかも確認してください)
- ログを見ると、Pythonでprintした内容が出力されていることが分かります
- また、引数であるevent内に、アップロードされたオブジェクトのバケット名やキー(ファイル名と場所)といった情報が格納されていることが分かります

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/9ee2c074-403f-9b4f-1e68-9dc526500148.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/b2dfdf81-50ae-7662-867a-818f186c784f.png)

## テンプレート

lambda-s3.yaml

```yaml:lambda-s3.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create a lambda function triggered by S3 upload

Parameters:
  OrganizationName:
    Description: Organization Name
    Type: String
  SystemName:
    Description: System Name
    Type: String

Resources:
  #-----------------------------------------------------------------------------
  # Lambda Function
  #-----------------------------------------------------------------------------
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${SystemName}-lambda-role
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service:
              - lambda.amazonaws.com
            Action:
              - sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub ${SystemName}-lambda
      Runtime: python3.10
      Handler: index.handler
      Role: !GetAtt LambdaRole.Arn
      Environment:
        Variables:
            VarLambdaRole: !Ref LambdaRole
            VarSystemName: !Sub ${SystemName}
      Code:
        ZipFile: |
          import os
          def handler(event, context):
            print('Lambda is called!!')
            print('event: ', event)
            print(os.environ['VarLambdaRole'])
            print(os.environ['VarSystemName'])

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref LambdaFunction
      Principal: s3.amazonaws.com
      # SourceArn: !GetAtt S3Bucket.Arn    # Avoid recursive reference
      SourceArn: !Sub arn:aws:s3:::${OrganizationName}-${SystemName}-bucket

  #-----------------------------------------------------------------------------
  # S3 bucket
  #-----------------------------------------------------------------------------
  S3Bucket:
    Type: AWS::S3::Bucket
    DependsOn: LambdaFunction
    Properties:
      BucketName: !Sub ${OrganizationName}-${SystemName}-bucket
      NotificationConfiguration:
        LambdaConfigurations:
          - Event: 's3:ObjectCreated:*'
            Function: !GetAtt LambdaFunction.Arn
      Tags:
        - Key: Name
          Value: !Sub ${OrganizationName}-${SystemName}-bucket
```

# S3へのアップロードをトリガーとして、EventBridge経由で呼び出す

## 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/8194bca9-a2fa-ba98-087e-82f76fd32c7a.png)

- 先ほどは、S3から直接Lambdaを呼び出しました
  - しかし、この方法だとS3バケット作成時にLambdaが事前に存在している必要があり、後から追加したりすることができません
  - また、本当に呼び出しを行ったかどうか、どれくらいの頻度で呼び出しが発生したかという情報が分かりません
- そこで、EventBridgeという仕組みを使います
  - EventBridgeが、S3バケットでのイベントを監視します
  - EventBridgeに対してRuleを設定し、ある条件になったらLambdaを呼び出すようにします
- S3バケット作成時には、 `EventBridgeEnabled: true` という設定をするだけで、詳細の設定は不要です
- 先ほどのテンプレートに加えて、`AWS::Events::Rule` を作成します
  - この中で、作成したS3バケットへのアップロード(ファイル作成)を条件として、Lambdaを呼び出すように設定します
- また、Lambdaの呼び出し元がS3からEventBridgeに変わったので、LambdaPermissionのprincipalとsourceも変更が必要になります

## 作成するリソース
- Lambda関連
  - AWS::IAM::Role
  - AWS::Lambda::Function
  - AWS::Lambda::Permission
- EventBridge関連
  - AWS::Events::Rule
- S3バケット関連
  - AWS::S3::Bucket

## デプロイ方法

### 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

### デプロイコマンド

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-06-b

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-lambda-s3-event \
--template-file ./lambda-s3-event.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

## 動作確認

- 下記コマンドによって、適当なファイルをS3バケットへアップロードします

```sh
touch dummy
aws s3 cp dummy s3://"${OrganizationName}-${SystemName}-bucket"
```

- その後、Lambdaのログを確認します。場所は以下の通りです
  - AWS Console -> CloudWatch -> Log Group -> /aws/lambda/${SystemName}
- また、作成したEventBridgeのモニタから、イベントが発生したかどうか、Lambdaを呼び出したかどうか、エラーが発生したかどうか、といったことが分かります。場所は以下の通りです
  - AWS Console -> Amazon EventBridge -> Rule -> 作成したルール (sample-06-b-lambda-s3-event-)
  - 反映されるのに少し時間がかかります

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/4a96cbfb-6e8c-f7f9-efcd-d764ad87b31b.png)

## テンプレート

lambda-s3-event.yaml

```yaml:lambda-s3-event.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create a lambda function triggered by S3 upload via EventBridge

Parameters:
  OrganizationName:
    Description: Organization Name
    Type: String
  SystemName:
    Description: System Name
    Type: String

Resources:
  #-----------------------------------------------------------------------------
  # Lambda Function
  #-----------------------------------------------------------------------------
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${SystemName}-lambda-role
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service:
              - lambda.amazonaws.com
            Action:
              - sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub ${SystemName}-lambda
      Runtime: python3.10
      Handler: index.handler
      Role: !GetAtt LambdaRole.Arn
      Environment:
        Variables:
            VarLambdaRole: !Ref LambdaRole
            VarSystemName: !Sub ${SystemName}
      Code:
        ZipFile: |
          import os
          def handler(event, context):
            print('Lambda is called!!')
            print('event: ', event)
            print(os.environ['VarLambdaRole'])
            print(os.environ['VarSystemName'])

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref LambdaFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt S3LambdaEventsRule.Arn

  #-----------------------------------------------------------------------------
  # EventBridge
  #-----------------------------------------------------------------------------
  S3LambdaEventsRule:
    Type: AWS::Events::Rule
    Properties:
      State: ENABLED
      EventPattern:
        source:
          - aws.s3
        detail:
          reason:
            - CopyObject
            - PutObject
            - CompleteMultipartUpload
          bucket:
            name:
              - !Ref S3Bucket
          # object:
          #   key:
          #     - suffix: .jpg
      Targets:
        - Arn: !GetAtt LambdaFunction.Arn
          Id: LambdaFunctionTarget

  #-----------------------------------------------------------------------------
  # S3 bucket
  #-----------------------------------------------------------------------------
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${OrganizationName}-${SystemName}-bucket
      NotificationConfiguration:
        EventBridgeConfiguration:
          EventBridgeEnabled: true
      Tags:
        - Key: Name
          Value: !Sub ${OrganizationName}-${SystemName}-bucket
```

# S3へのアップロードをトリガーとして、SQS経由で呼び出す

## 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/1d88e96d-2ae8-79d1-e54c-865451d22829.png)

- 今度は、EventBridgeの代わりにSimple Queue Service (SQS) を使ってLambdaを呼び出してみます
- S3バケットにファイルがアップロードされたら、キューに情報を送信するようにします
  - そのために、S3バケット作成時に `NotificationConfiguration` -> `QueueConfigurations` で後で作成するSQSを指定します
    - ちなみに、ここの結合を疎にするため、S3 -> EventBridge -> SQS -> Lambdaとすることも出来ます。[参考](https://github.com/iwatake2222/aws_cloudformation_template/blob/master/06_lambda_s3/lambda-s3-event-sqs.yaml)
- SQSキューを作成します
  - 色々と設定はあるのですが、ここではデフォルトのままにします
  - S3からこのキューに送信できるように、`QueuePolicy` の設定をします。これを忘れるとデプロイ時にS3バケット作成でエラーが出ます
- Lambda関数の方は、トリガーがSQSに変わったため、`Lambda:Permission` のsourceとprincipalを変更しておきます
- また、SQSにメッセージが送られたことをトリガーとしてLambdaを呼び出すように `EventSourceMapping` の設定をします
- Lambda関数のコード内で、わざわざキューから `receive_message` をしたりということは不要です。これまでと同じように呼び出し時の引数 `event` 内に必要な情報は格納されています。また、キューからメッセージの削除も自動的に行われます
  - ただし、明示的にSQSの操作をしないでも、上記の通り実際にLambdaとしてSQSに対して操作をするのでLambdaのIAMロールに対して、SQSに対するアクセス権限を付与するポリシーの設定が必要になります

## 作成するリソース
- Lambda関連
  - AWS::IAM::Role
  - AWS::Lambda::Function
  - AWS::Lambda::Permission
  - AWS::Lambda::EventSourceMapping
- SQS関連
  - AWS::SQS::Queue
  - AWS::SQS::QueuePolicy
- S3バケット関連
  - AWS::S3::Bucket

## デプロイ方法

### 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

### デプロイコマンド

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-06-c

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-lambda-s3-sqs \
--template-file ./lambda-s3-sqs.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

## 動作確認

- 下記コマンドによって、適当なファイルをS3バケットへアップロードします

```sh
touch dummy
aws s3 cp dummy s3://"${OrganizationName}-${SystemName}-bucket"
```

- その後、Lambdaのログを確認します。場所は以下の通りです
  - AWS Console -> CloudWatch -> Log Group -> /aws/lambda/${SystemName}
- また、作成したSQSのモニタリングから、イベントが発生したかどうか、Lambdaを呼び出したかどうか、エラーが発生したかどうか、といったことが分かります。場所は以下の通りです
  - AWS Console -> Amazon SQS -> キュー -> 作成したキュー (sample-06-c-queue)
  - また、「メッセージを送受信」からメッセージを送信することでもLambdaを呼び出すことが可能です
    - S3へファイルをアップロードしたら受信メッセージが現れるはずですが、ポーリングするよりも前にLambdaが呼ばれてメッセージは即削除されて見えないようです
    - (トリガーを一時的に外せば確認できます)

## テンプレート

lambda-s3-sqs.yaml

```yaml:lambda-s3-sqs.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create a lambda function triggered by S3 upload via SQS Queue

Parameters:
  OrganizationName:
    Description: Organization Name
    Type: String
  SystemName:
    Description: System Name
    Type: String

Resources:
  #-----------------------------------------------------------------------------
  # Lambda Function
  #-----------------------------------------------------------------------------
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${SystemName}-lambda-role
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service:
              - lambda.amazonaws.com
            Action:
              - sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: !Sub ${SystemName}-lambda-policy
          PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Action:
                  - 'sqs:*'
                Resource:
                  - !GetAtt SQSQueue.Arn

  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub ${SystemName}-lambda
      Runtime: python3.10
      Handler: index.handler
      Role: !GetAtt LambdaRole.Arn
      Environment:
        Variables:
            SQSQueueUrl: !GetAtt SQSQueue.QueueUrl
      Code:
        ZipFile: |
          import boto3
          import os
          def handler(event, context):
            print('Lambda is called!!')
            print('event: ', event)

            # # No need to receive_message
            # queue_url = os.environ['SQSQueueUrl']
            # sqs_client = boto3.client('sqs')
            # response = sqs_client.receive_message(QueueUrl=queue_url)
            # print(response)

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref LambdaFunction
      Principal: sqs.amazonaws.com
      SourceArn: !GetAtt SQSQueue.Arn

  LambdaEventSourceMapping:
    Type: AWS::Lambda::EventSourceMapping
    Properties:
      EventSourceArn: !GetAtt SQSQueue.Arn
      FunctionName: !GetAtt LambdaFunction.Arn

  #-----------------------------------------------------------------------------
  # SQS Queue
  #-----------------------------------------------------------------------------
  SQSQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub ${SystemName}-queue
      # ContentBasedDeduplication: true
      # FifoQueue: true

  SQSQueuePolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      PolicyDocument:
        Version: 2012-10-17
        Statement:
          - Action:
            - sqs:SendMessage
            Effect: Allow
            Principal: '*'
            Resource: !GetAtt SQSQueue.Arn
            Condition:
              ArnEquals:
                # aws:SourceArn: !GetAtt S3Bucket.Arn    # Avoid recursive reference
                aws:SourceArn: !Sub arn:aws:s3:::${OrganizationName}-${SystemName}-bucket
      Queues:
        - !Ref SQSQueue

  #-----------------------------------------------------------------------------
  # S3 bucket
  #-----------------------------------------------------------------------------
  S3Bucket:
    Type: AWS::S3::Bucket
    DependsOn: SQSQueue
    Properties:
      BucketName: !Sub ${OrganizationName}-${SystemName}-bucket
      NotificationConfiguration:
        QueueConfigurations:
          - Event: 's3:ObjectCreated:*'
            Queue: !GetAtt SQSQueue.Arn
      Tags:
        - Key: Name
          Value: !Sub ${OrganizationName}-${SystemName}-bucket
```
