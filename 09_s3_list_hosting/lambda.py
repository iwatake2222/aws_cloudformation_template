import os
import boto3
import tempfile

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
  

def handler(event, context):
  print(event)
  bucket, key = get_key_from_event(event)
  if bucket == '' or key == '':
    print('Invalid key')
    return

  key_list = key.split('/')
  if len(key_list) < 2:
    print('The uploaded file is ignored')
    return
  dir_name = key_list[0]
  file_name = key_list[1]
  
  html_doc = ''
  html_doc += f'<h1>{dir_name}</h1>'
  html_doc += '<ul>'
  s3 = boto3.client('s3')
  response = s3.list_objects_v2(Bucket=bucket, Prefix=dir_name)
  for obj in response.get('Contents', []):
    file_path = obj['Key'].split('/')[1:]
    file_path = '/'.join(file_path)
    if file_path == 'index.html':
      continue
    html_doc += f'<li><a href={file_path}>{file_path}</a></li>'
  html_doc += '</ul>'

  html_file_path = os.path.join(tempfile.gettempdir(), 'index.html')
  with open(html_file_path, 'w') as file:
    file.write(html_doc)
  with open(html_file_path, 'rb') as file:
    s3.upload_fileobj(Fileobj=file, Bucket=bucket, Key=dir_name+'/index.html')
  os.remove(html_file_pathfile_path)
  
