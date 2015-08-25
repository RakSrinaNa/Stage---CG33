import logging
import os
import shutil

__author__ = 'tcouchoud'

import time

import ExportActSport
import ExportCampings
import ExportChHotes
import ExportDegustation
import ExportHebergtColl
import ExportHotels
import ExportItiTouristiques
import ExportLoisirs
import ExportManifestations
import ExportMeubles
import ExportPatCulturel
import ExportPatNaturel
import ExportResidences

try:
	shutil.rmtree('.\LOGS')
except:
	pass

# Permet de creer un repertoire
def createDirectory(path):
	if not os.path.exists(path):
		os.makedirs(path)
	return path

logFileName = '.\LOGS\log_tot_' + str(time.time()) + '.log'
createDirectory('.\LOGS')
logging.basicConfig(filename=logFileName, filemode='w', level=logging.DEBUG)

def log(message):
	print message
	logging.info(message)

start = time.time()

ExportActSport.go()
ExportCampings.go()
ExportChHotes.go()
ExportDegustation.go()
ExportHebergtColl.go()
ExportHotels.go()
ExportItiTouristiques.go()
ExportLoisirs.go()
ExportPatCulturel.go()
ExportPatNaturel.go()
ExportResidences.go()
ExportMeubles.go()
ExportManifestations.go()

secs = round(time.time() - start, 0)

mins = secs / 60
secs %= 60

hours = mins / 60
mins %= 60

print 'Recuperation totale terminee en ' + str(hours) + 'h ' + str(mins) + 'min ' + str(secs) + 's'
