# Fixed root-edge segment and an articulated forearm on an integer grid.
root,elbow,tip=(0,0),(1,0),(2,0)
rotate=lambda p:(-p[1],p[0])
whole=tuple(map(rotate,[root,elbow,tip]))
rig=(root,elbow,(1,1))
print('whole',whole,'hinge',rig,'elbow length from root',whole[1],rig[1])
baseline={(0,0),(1,0),(2,0)}; marked={(0,0),(2,0)}
print('missing pixels',len(baseline^marked), 'possible labels: torn stroke or intentional blink')
