from __future__ import annotations
import boto3
import datetime
import dateutil
import logging
import os
import sys
import tempfile
import time


def create_logger():
  logger = logging.getLogger()
  for h in logger.handlers:
    logger.removeHandler(h)
  h = logging.StreamHandler(sys.stdout)
  formatter = logging.Formatter('[%(levelname)s][%(funcName)s:%(lineno)s]: %(message)s')
  def custome_time(*args):
    return datetime.datetime.now(tz=dateutil.tz.gettz('Asia/Tokyo')).timetuple()
  formatter.converter = custome_time
  h.setFormatter(formatter)
  logger.addHandler(h)
  logger.setLevel(logging.INFO)
  return logger

logger = create_logger()


def get_key_from_event(event):
  source = event.get('source', '')
  if source != 'aws.s3':
    print('Invalid Event')
    return '', ''
  detail = event.get('detail', {})
  bucket = detail.get('bucket', {})
  bucket = bucket.get('name', '')
  object = detail.get('object', {})
  key = object.get('key', '')
  return bucket, key


def check_if_key_is_ignored(key):
  key_list = key.split('/')
  if len(key_list) < 2:
    return True
  elif len(key_list) == 2 and key_list[-1] == 'index.html':
    return True
  return False


def crete_html_doc(title: str, item_list: list[str]) -> str:
  html_doc = \
  f'''
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
      crossorigin="anonymous"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.0/font/bootstrap-icons.css"
    />
    <title>{title}</title>
  </head>
  <body>
  <div class="container">
  '''
  html_doc += f'<h1>{title}</h1>'
  html_doc += '<ul>'
  for item in item_list:
    html_doc += f'<li><a href={item}>{item}</a></li>'
  html_doc += '</ul>'
  html_doc += '</div></body></html>'
  return html_doc


def upload_html(html_doc: str, bucket: str, key: str):
  html_file_path = os.path.join(tempfile.gettempdir(), 'index.html')
  with open(html_file_path, 'w') as file:
    file.write(html_doc)
  with open(html_file_path, 'rb') as file:
    s3 = boto3.client('s3')
    s3.upload_fileobj(Fileobj=file, Bucket=bucket, Key=key, ExtraArgs={'ContentType': 'text/html'})
  os.remove(html_file_path)


def invalidate_distribution(distribution_id, key_list):
  cloudfront = boto3.client('cloudfront')
  try:
    cloudfront.create_invalidation(DistributionId=distribution_id,
      InvalidationBatch={
        'Paths': {
          'Quantity': len(key_list),
          'Items': key_list
        },
      'CallerReference': str(time.time())
    })
  except Exception as e:
    logger.error(f'[Error] {e}')


def handler(event, context):
  logger.info(event)
  bucket, key = get_key_from_event(event)
  if not (bucket and key):
    logger.warning('Key is invalid')
    return

  if check_if_key_is_ignored(key):
    logger.info('Key is ignored')
    return

  dir_name = key.split('/')[0]

  s3 = boto3.client('s3')
  response = s3.list_objects_v2(Bucket=bucket, Prefix=dir_name)
  file_path_list = []
  for obj in response.get('Contents', []):
    file_path = obj['Key'].split('/')[1:]
    if file_path[-1] == 'index.html':
      continue
    file_path = '/'.join(file_path)
    file_path_list.append(file_path)
  html_doc = crete_html_doc(dir_name, file_path_list)
  upload_html(html_doc, bucket, dir_name+'/index.html')

  response = s3.list_objects_v2(Bucket=bucket, Delimiter='/')
  dir_list = []
  for common_prefix  in response.get('CommonPrefixes', []):
    dir_list.append(common_prefix['Prefix'] + 'index.html')
  html_doc = crete_html_doc('Directory list', dir_list)
  upload_html(html_doc, bucket, 'index.html')

  invalidate_distribution(os.environ['DISTRIBUTION_ID'], ['/index.html', f'/{dir_name}/index.html'])
