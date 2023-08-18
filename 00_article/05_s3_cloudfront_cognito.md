AWS CloudFormation: 05. S3 + CloudFront + Cognito + Lambda@Edge による認証機能付き静的ウェブサイトのホスティング

# 本記事について

- AWS CloudFormationを用いて、色々なアーキテクチャを構築していきます。テンプレートのコピペ元としてご活用いただければ幸いです
  - [01. 仮想ネットワークの構築](https://qiita.com/iwatake2222/items/d19bd983391a292345af)
  - [02. アプリケーションサーバーの構築と踏み台サーバー経由でのアクセス方法](https://qiita.com/iwatake2222/items/45822e5ef9b56df42069)
  - [03. S3バケットの作成とポリシー・アクセス許可の設定](https://qiita.com/iwatake2222/items/d9c977e740ec1ee16b9c)
  - [04. S3 (+ CloudFront + OAC) による静的ウェブサイトのホスティング](https://qiita.com/iwatake2222/items/ac4392c11f83af2f320a)
  - [05. S3 + CloudFront + Cognito + Lambda@Edge による認証機能付き静的ウェブサイトのホスティング](https://qiita.com/iwatake2222/items/998d77951b7044e9bbbf)
  - [06. Lambda関数を作成して、S3/EventBridge/SQS から呼び出す](https://qiita.com/iwatake2222/items/e6eed5301e807e1a685d)
- [最新テンプレートはGitHubに配置しています](https://github.com/iwatake2222/aws_cloudformation_template)
- 本記事では、[前回作成した「S3 + CloudFront + OACによる静的ウェブサイトのホスティング」](https://qiita.com/iwatake2222/items/ac4392c11f83af2f320a)に、Cognitoを用いた認証機能を付けます。これによって、許可されたユーザーのみがサイトを閲覧できるようにします

# 構築するアーキテクチャ

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/b5df849f-cdc9-1796-e8b6-d25529cf1170.png)

- まず、S3とCloudFrontとOACを作成し、静的ウェブサイトとしてホスティングができるようにします。これらの設定は前回と全く同じです
- 次に、認証用のCognito UserPoolと、それに付随してCognitoドメインとアプリケーションクライアントも作成します
  - アプリケーションクライアントでは、作成したCognitoドメインを使用するようにホストされたUIを設定します。これによって、ユーザープールのサインアップとサインイン用のウェブページが自動的に使えるようになります
  - 今回、設定はほぼデフォルトのままとし、認証方法も簡単なIDとパスワードによるものを使います
- ユーザーがCloudFront経由でサイトにアクセスしたら、Cognito認証を呼び出すようにする必要があります
  - このために、Lambda関数 (Lambda@Edge) を作成します。Lambda@Edgeはus-east-1 (バージニア北部) リージョンでしかサポートされていないため、これだけは別のテンプレートで作成します
  - Lambda関数内で、Cognito認証ページへリダイレクトしたり、認証処理を記載する必要があります。これを簡単に行うために、[cognito-at-edge](https://github.com/awslabs/cognito-at-edge)というものを使います。詳細は後述

## 作成するリソース
- S3バケット関連
  - AWS::S3::Bucket
  - AWS::S3::BucketPolicy
- CloudFront関連
  - AWS::CloudFront::Distribution
  - AWS::CloudFront::OriginAccessControl
- Cognito認証関連
  - AWS::Cognito::UserPool
  - AWS::Cognito::UserPoolDomain
  - AWS::Cognito::UserPoolClient
- Cognito認証関連 (cognito-at-edge)
  - AWS::IAM::Role
  - AWS::Lambda::Function

# デプロイ方法

## 必要な準備

- [AWSアカウントとアクセスキーの設定](https://qiita.com/iwatake2222/items/d19bd983391a292345af#%E5%BF%85%E8%A6%81%E3%81%AA%E6%BA%96%E5%82%99)
- サーバーレス環境のため、特にVPCなどは不要です。事前の環境構築は不要です

## S3 + CloudFront + OACによる静的ウェブサイトの作成
- まずは前回と同様に基本となる静的ウェブサイトを作成します
- その後、適当なindex.htmlをアップロードしてサイトにアクセスできることを確認します

```sh
Region=ap-northeast-1
OrganizationName=iwatake2222
SystemName=sample-05

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}"-s3-cloudfront-cognito \
--template-file ./s3-cloudfront-cognito.yaml \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"

aws cloudformation describe-stacks --stack-name "${SystemName}"-s3-cloudfront-cognito

echo hello > index.html
aws s3 cp index.html s3://"${OrganizationName}-${SystemName}-bucket"
```

## Lambda@Edgeの作成

- 次に、Lambda@Edgeを作成します
- Lambda関数のコードはテンプレート内に直接、'Hello from Lambda!'という文字列を返す簡単なものを書いています。これは後でcognito-at-edgeに差し替えます
- デプロイ先はus-east-1リージョンとなります

```sh
RegionForLambdaEdge=us-east-1
OrganizationName=iwatake2222
SystemName=sample-05

aws cloudformation deploy \
--region "${RegionForLambdaEdge}" \
--stack-name "${SystemName}"-s3-cloudfront-cognito-lambda-edge \
--template-file ./s3-cloudfront-cognito-lambda-edge.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
OrganizationName="${OrganizationName}" \
SystemName="${SystemName}"
```

## Lambda@Edgeに対してCloudFrontをトリガーとして設定する

- CloudFrontに対して、 `viewer request` が発生したらLambda@Edgeを呼ぶように設定します
  - この設定はCloudFormationからだと出来なかったのでAWS Consoleから行います
- AWS Console -> us-east-1リージョンに移動 -> Lambda -> 作成したLambda関数 (sample-05-lambda-edge) を選択
- `トリガーを追加` -> `ソース` = `CloudFront` を選択 -> `Deploy to Lambda@Edge` をクリック
- `Configure new CloudFront trigger` を選択し、以下の設定を行う
  - `Distribution` = 作成したDistribution (sample-05-distribution)
  - `Cache behavior` = *
  - `CloudFront event` = Viewer request   <- 大事
  - `Confirm deploy to Lambda@Edge` = チェックをつける
  - `デプロイ` をクリック

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/88e92880-7666-59b4-fcc5-f5a845e57078.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/130b7704-9c5a-f2e6-fd1e-e86ce7834976.png)

- 動作確認
  - 図のように、バージョンが選ばれた状態で、CloudFrontがトリガーとして指定されていればOKです
  - 再度CloudFrontのページにアクセスし、ページの内容がLambda@Edgeで返却している文字列「Hello from Lambda!」になっていればOKです
    - 反映されるのに少し時間がかかるかもしれません
    - 先ほど動作確認で同じサイトにアクセスするため、キャッシュが残っている可能性があります。表示が先ほどと変わらない場合は、キャッシュをクリアするか、別のブラウザやプライベートモードで試してみてください
      - ブラウザを開発者モードにして、リロードボタンを長押しや右クリックするとキャッシュクリアしたうえでリロードできます
- 削除時の注意
  - CloudFormationスタックやLambda関数を削除する前には、CloudFrontをトリガーから外す必要があります
    - トリガーから外す操作をしても、それが反映されてエラーなく削除できるようになるまで10分程度かかりました

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/9e8309ea-e02d-9351-56ac-cb0795544503.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/f59584c9-ac95-34ed-173d-318f3be914c4.png)

## cognito-at-edgeのデプロイ

- 先ほど作成したLambda@Edgeは、hello world的な文字列を返すだけのものです。この関数の中身をcognito-at-edgeに差し替えます
  - 手順は基本的にはhttps://github.com/awslabs/cognito-at-edge のGet Startedの通りです
- 作業用PC上で下記コマンドで、cognito-at-edgeを取得します。また、index.jsも作成しておきます

```sh
mkdir -p cognito-at-edge && cd cognito-at-edge
npm install cognito-at-edge
nano index.js
cd ..
```

```js:index.js
const { Authenticator } = require('cognito-at-edge');

const authenticator = new Authenticator({
  // Replace these parameter values with those of your own environment
  region: 'ap-northeast-1', // user pool region
  userPoolId: 'ap-northeast-1_tyo1a1FHH', // user pool ID
  userPoolAppId: '63gcbm2jmskokurt5ku9fhejc6', // user pool app client ID
  userPoolDomain: 'iwatake2222-sample-05.auth.ap-northeast-1.amazoncognito.com', // user pool domain
});

exports.handler = async (request) => authenticator.handle(request);
```
 
- index.jsの `region` 、 `userPoolId` 、 `userPoolAppId` 、 `userPoolDomain` は、自分の環境に応じて編集してください
  - 今回使うテンプレートでは、下記コマンドによって必要な情報を出力しています
    - "OutputValue" の値をコピペしてください。「"」が入らないように注意してください
  - AWS Console上でCognitoの設定を確認しに行くのでも大丈夫です

```sh
aws cloudformation describe-stacks --stack-name "${SystemName}"-s3-cloudfront-cognito
```

- 設定が完了したcognito-at-edgeをzipに固めてデプロイします

```sh
cd cognito-at-edge
zip -r ../cognito-at-edge.zip ./*
cd ..
RegionForLambdaEdge=us-east-1
aws lambda update-function-code --region "${RegionForLambdaEdge}" --function-name "${SystemName}-lambda-edge" --zip-file fileb://cognito-at-edge.zip
```

- 新しいバージョンのコードをアップロードしたので、このバージョンのコードに対して再度CloudFrontをトリガーとして設定します
  - AWS Console -> us-east-1リージョンに移動 -> Lambda -> 作成したLambda関数 (sample-05-lambda-edge) を選択
    - 新しいバージョンになったため、トリガーが設定されていない状態のはずです
  - `トリガーを追加` -> `ソース` = `CloudFront` を選択 -> `Deploy to Lambda@Edge` をクリック
  - `Use existing CloudFront trigger on this function` を選択し、先ほど作成したトリガーを選び、デプロイをクリック
    - 先ほど作成したトリガーを使うので、今回は設定不要です

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/278873ab-4a35-bf1d-3c48-9050abf33810.png)

- 動作確認
  - 再度CloudFrontのページにアクセスし、図のようにサインイン画面が表示されていればOKです
    - 反映されるのに少し時間がかかるかもしれません
    - 先ほど動作確認で同じサイトにアクセスしたため、キャッシュが残っている可能性があります。サインイン画面が現れない場合は、キャッシュをクリアするか、別のブラウザやプライベートモードで試してみてください
      - ブラウザを開発者モードにして、リロードボタンを長押しや右クリックするとキャッシュクリアしたうえでリロードできます
  - うまくいかない場合は、index.jsの設定を間違えていたり、zip化する場所をまちがえている可能性があります
  - また、下記の場所でLambdaのログを確認できます
    - AWS Console -> CloudFrontをデプロイしたリージョン(東京)に移動 -> CloudWatch -> ロググループ -> /aws/lambda/us-east-1.${Lambda@Edge名}

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/90bf8800-5f43-0930-b5dc-1c721d3371be.png)

# 全体の動作確認
- 現状はユーザーが登録されていない状態なので、サインインできません
- 以下の2つの方法でユーザー登録できます。ここでは2つ目の方法を試してみます
  - AWS Console -> Cognito -> UserPoolからユーザーを登録
  - ブラウザ上で表示されているサインイン画面からサインアップ (ユーザー登録) し、その後そのユーザーを承認する
- ユーザー登録
  - 表示されているサインイン画面の `Sign up` をクリックします
  - `Sign up` 画面で、適当なユーザー名とパスワードで登録します
  - その後、「An error was encountered with the requested page.」という画面が表示されますが無視して大丈夫です
    - 恐らく、今登録したユーザー情報で自動的にサインインしようとしていると思うのですが、今の時点だとこのユーザーはまだ使えません。そのため失敗しているのだと思われます
      - 逆に、ここで失敗してくれないと、新規のユーザーを登録すれば誰でも閲覧可能になってしまいます
- ユーザーの承認
  - AWS Console -> Cognito -> 作成したユーザープール (sample-05-user-pool) を選択します
  - ユーザータブを見ると、先ほど登録したユーザーがいますが「未確認」の状態です
  - このユーザーをクリックし、ユーザー情報を開きます
  - `アクション` -> `アカウントの確認` をクリックし、このユーザーを承認 (Confirm) してアクセス権を付与します
- 再度ブラウザからサイトにアクセスし、サインイン画面を表示します
- ここで、先ほど登録したユーザー名とパスワードを入力してサインインします
- S3にアップロードしたindex.html (「hello」) が表示されればOKです

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/f2003529-bda4-7951-7df3-d74b281324ac.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/8de276df-8f92-08f9-d200-40a1f98ec10f.png)
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/214268/5f00d4d9-3290-ff7b-a9e5-f2f4a5d198fb.png)




# テンプレート

## 静的ウェブサイト (S3とCloudFrontとOAC) と Cognitoを作成するテンプレート

s3-cloudfront-cognito.yaml

```yaml:s3-cloudfront-cognito.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create an S3 bucket and CloudFront (OAC) for hosting a static website with Cognito authentification

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


  #-----------------------------------------------------------------------------
  # Cognito User pool
  #-----------------------------------------------------------------------------
  CognitoUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub ${SystemName}-user-pool

  CognitoUserPoolDomain:
    Type: AWS::Cognito::UserPoolDomain
    Properties:
      Domain: !Sub ${OrganizationName}-${SystemName}
      UserPoolId: !Ref CognitoUserPool

  CognitoUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub ${SystemName}-client
      UserPoolId: !Ref CognitoUserPool
      CallbackURLs:
        - !Join ["", [https://, !GetAtt CloudFrontDistribution.DomainName]]
      SupportedIdentityProviders:
        - COGNITO
      AllowedOAuthFlows:
        - code
      AllowedOAuthFlowsUserPoolClient: true
      AllowedOAuthScopes:
        - openid

Outputs:
  CloudFrontDomainName:
    Value: !GetAtt CloudFrontDistribution.DomainName
    Export:
      Name: !Sub ${SystemName}-domain-name
  UserPool:
    Value: !Ref CognitoUserPool
    Export:
      Name: !Sub ${SystemName}-user-pool
  UserPoolClient:
    Value: !Ref CognitoUserPoolClient
    Export:
      Name: !Sub ${SystemName}-user-pool-client
  UserPoolDomain:
    Value: !Ref CognitoUserPoolDomain
    Export:
      Name: !Sub ${SystemName}-user-pool-domain
```

## Lambda@Edgeを作成するテンプレート

s3-cloudfront-cognito-lambda-edge.yaml

```yaml:s3-cloudfront-cognito-lambda-edge.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: |
  Create an S3 bucket and CloudFront (OAC) for hosting a static website with Cognito authentification

Parameters:
  SystemName:
    Description: System Name
    Type: String

Resources:
  #-----------------------------------------------------------------------------
  # IAM roles
  #-----------------------------------------------------------------------------
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${SystemName}-lambda-edge-role
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service:
              - lambda.amazonaws.com
              - edgelambda.amazonaws.com
            Action:
              - sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: !Sub ${SystemName}-lambda-edge-policy
          PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Action:
                  - lambda:GetFunction
                  - lambda:EnableReplication*
                  - iam:CreateServiceLinkedRole
                  - cloudfront:CreateDistribution
                  - cloudfront:UpdateDistribution
                Resource: '*'

  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub ${SystemName}-lambda-edge
      Role: !GetAtt LambdaRole.Arn
      Runtime: nodejs18.x
      Handler: index.handler
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            const response = {
                status: 200,
                body: JSON.stringify('Hello from Lambda!'),
            };
            return response;
          };
```
