"""src/ 파일과 캐릭터 이미지를 한 개의 index.html로 묶습니다.  사용: python3 build.py"""
import base64, pathlib
R = pathlib.Path(__file__).parent
src = lambda p: (R / 'src' / p).read_text(encoding='utf-8')
imgs = [base64.b64encode((R / 'assets' / f'stage{i}.webp').read_bytes()).decode() for i in (1, 2, 3)]
arts = [base64.b64encode((R / 'assets' / f'art{i}.webp').read_bytes()).decode() for i in (1, 2, 3)]
img_js = 'window.AQ_ART=[' + ','.join(f'"data:image/webp;base64,{b}"' for b in arts) + '];window.AQ_IMG=[' + ','.join(f'"data:image/webp;base64,{b}"' for b in imgs) + '];'
title = base64.b64encode((R / 'assets' / 'title.webp').read_bytes()).decode()
logo = base64.b64encode((R / 'assets' / 'logo.webp').read_bytes()).decode()
img_js += f'window.AQ_LOGO="data:image/webp;base64,{logo}";'
tpl = base64.b64encode((R / 'assets' / 'template916.webp').read_bytes()).decode()
img_js += f'window.AQ_TPL="data:image/webp;base64,{tpl}";'
img_js += f'window.AQ_TITLE="data:image/webp;base64,{title}";'
html = src('index.html')
for k, v in {'CSS': src('style.css'), 'DATA': src('data.js'), 'COURSES': src('courses.js'), 'FOREST': src('forest.js'), 'LOGIC': src('logic.js'), 'IMG': img_js, 'APP': src('app.js')}.items():
    html = html.replace(f'/*@@{k}@@*/', v)
(R / 'dist').mkdir(exist_ok=True)
(R / 'dist' / 'index.html').write_text(html, encoding='utf-8')
import shutil; shutil.copy(R / 'assets' / 'video' / 'intro.mp4', R / 'dist' / 'intro.mp4')
print('dist/index.html', len(html) // 1024, 'KB')

# GitHub Pages용 완전한 HTML 문서 (docs/) — 계정 없이 누구나 URL로 접속
page = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        '</head>\n<body>\n' + html + '\n</body>\n</html>\n')
(R / 'docs').mkdir(exist_ok=True)
(R / 'docs' / 'index.html').write_text(page, encoding='utf-8')
shutil.copy(R / 'assets' / 'video' / 'intro.mp4', R / 'docs' / 'intro.mp4')
(R / 'docs' / '.nojekyll').write_text('')
print('docs/index.html (GitHub Pages) ready')
