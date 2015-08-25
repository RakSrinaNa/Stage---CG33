__author__ = 'tcouchoud'

import arcpy
import ExpUtils as Utils

print '--- INIT'

######################################################################################
# PARAMS
######################################################################################

tempBddName = 'tmp.gdb'  # Nom du fichier de la base de donnee temporaire

tempDir = '.\TEMP'  # Dossier temporaire

url = '132.1.10.223'  # URL
user = 'ConsultGrr'
password = '3ConsultGrr7'
bdd = 'grr'
table = 'grr_entry'
#cheminOutputCC47 = r'Testt.gdb\SallesEntries' #Chemin de la table finale
cheminOutputCC47 = r'dsi@bdsig@vecteur.sde\SallesEntries'  # Chemin de la table finale

proxyURL = 'http://132.1.10.230:8080'  # URL du proxy (Null si aucun proxy)
idLabel = 'id'
startLabel = 'start_time'
endLabel = 'end_time'
roomIdLabel = 'room_id'

def go():
	Utils.Utils().export(url, tempBddName, tempDir, user, password, bdd, table, cheminOutputCC47, proxyURL, idLabel, startLabel, endLabel, roomIdLabel)

if __name__ == '__main__':  # Si on a execute ce fichier, let's go!
	go()
