import sys
from pathlib import Path
from PIL import Image, ImageDraw
src, out, frames, columns = sys.argv[1:]
gif = Image.open(src)
frames = [int(x) for x in frames.split(',')]
cols = int(columns)
w, h = gif.size
# Render.ts normally exports a 3x GIF. Every figure here is one native pixel per pixel.
scale = w // 176
w, h = w // scale, h // scale
sheet = Image.new('RGB',(cols*w,((len(frames)+cols-1)//cols)*(h+14)), '#201e23')
pen = ImageDraw.Draw(sheet)
for i, frame in enumerate(frames):
    gif.seek(frame)
    ox, oy = i%cols*w, i//cols*(h+14)
    sheet.paste(gif.convert('RGB').resize((w,h),Image.Resampling.NEAREST),(ox,oy+14))
    pen.text((ox+4,oy),str(frame),fill='#fcf9ef')
sheet.save(out)
