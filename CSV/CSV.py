__author__ = 'MrCraftCod'

import re

################################################################################################

input1 = 'A.csv' #Ficher CSV 1
input1Column = 'Nom_commune' #Colonne ou effectuer la jointure

input2 = 'B.csv' #Fichier CSV 2
input2Columns = 'Nom de la commune' #Colonne ou effectuer la jointure

output = 'C.csv' #Fichier CSV de sortie

################################################################################################

def getEntries(path):
    entries = dict()
    fil = open(path, 'r')
    lines = []
    for lin in fil:
        lines.append(unicode(lin.decode('iso8859-1')).replace('\n', ''))
    fil.close()
    k = 0
    head = lines.pop(0)
    for ke in head.split(';'):
        values = []
        for lin in lines:
            values.append(lin.split(';')[k])
        entries[ke] = values
        k +=1
    print '\tFOUND ' + str(len(entries)) + ' COLUMNS WITH ' + str(len(entries[head.split(';')[0]])) + ' ENTRIES FOR FILE ' + path
    return entries

def normalise(e):
    return re.sub(r'(.+) (\((.+)\))', r'\3 \1', e.encode('ASCII', 'ignore').replace('-', ' ').replace('/', 'SUR'))

def isSameElement(e1, e2):
    return normalise(e1).upper() == normalise(e2).upper()

print '\nGETTING ENTRIES...'

entries1 = getEntries(input1)
entries2 = getEntries(input2)

print '\nMATCHING...'

finalLines = []
header = []
for key in entries1.iterkeys():
    header.append(key)
for key in entries2.iterkeys():
    header.append(key)
finalLines.append(header)

i = 0
j = 0
m = 0
for element in entries1[input1Column]:
    j = 0
    for element2 in entries2[input2Columns]:
        if isSameElement(element, element2):
            print '\tMATCH: ' + element + ' <-> ' + element2
            m += 1
            line = []
            for key, value in entries1.iteritems():
                line.append(value[i])
            for key, value in entries2.iteritems():
                line.append(value[j])
            finalLines.append(line)
        j += 1
    i += 1
print str(m) + ' ENTRIES MATCHED'

print '\nWRITTING NEW FILE AS ' + output
fi = open(output, 'w')

for li in finalLines:
    first = True
    for el in li:
        if not first:
            fi.write(';')
        fi.write(el.encode('iso8859-1'))
        first = False
    fi.write('\n')
fi.close()