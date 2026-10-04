from PIL import Image
A='assets/'
crops = {
 'logo_indogrosir': (1, (676, 52, 1006, 140)),
 'magnum':          (1, (440, 335, 945, 700)),
 'aice_crispy':     (1, (462, 815, 868, 1185)),
 'logo_walls':      (1, (918, 322, 1078, 418)),
 'logo_aice':       (1, (883, 815, 1078, 912)),
 'member_cards':    (1, (402, 1292, 668, 1368)),
 'haku_vanilla':    (2, (66, 656, 550, 922)),
 'haku_straw':      (2, (578, 656, 1058, 922)),
 'haku_double':     (2, (302, 982, 828, 1252)),
 'fb_choconut':     (3, (32, 692, 602, 928)),
 'fb_cookies':      (3, (32, 986, 602, 1192)),
 'fb_potabee':      (3, (612, 672, 842, 1198)),
 'fb_crunchy':      (3, (858, 636, 1102, 1198)),
 'fp_straw':        (4, (42, 682, 668, 848)),
 'fp_vanilla':      (4, (30, 938, 670, 1092)),
 'shaky':           (4, (686, 650, 1020, 1112)),
 'histeria':        (5, (55, 540, 805, 1225)),
}
for name,(i,box) in crops.items():
    Image.open(f'{A}{i}.jpg').crop(box).save(f'{A}{name}.png')
# contact sheet
ims=[Image.open(f'{A}{n}.png') for n in crops]
W=1600; x=y=0; rowh=0; sheet=Image.new('RGB',(W,2400),'white')
for im in ims:
    im.thumbnail((380,380))
    if x+im.width>W: x=0; y+=rowh+10; rowh=0
    sheet.paste(im,(x,y)); x+=im.width+10; rowh=max(rowh,im.height)
sheet.crop((0,0,W,y+rowh)).save('/tmp/claude-0/-home-user-klikigr/37ab31d3-2efb-5cd9-9f1a-d244fb7493d4/scratchpad/sheet.jpg')
