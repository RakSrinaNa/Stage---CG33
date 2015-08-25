__author__ = 'tcouchoud'

import arcpy

import ExpUtils as Utils

print '--- INIT'

######################################################################################
# PARAMS
######################################################################################

tempBddName = 'tmp.gdb'  # Nom du fichier de la base de donnee temporaire
tempPicsBddName = 'pics_app.dbf'  # Nom du fichier temporaire pour les pieces jointes

tempDir = '.\TEMP'  # Dossier temporaire
tempPictureDir = 'Pics'  # Dossier temporaire des photos (sera cree dans tempDir)

url = 'http://wcf.tourinsoft.com/Syndication/cdt37/4302856c-ef05-4260-8ace-179736192dde'  # URL
# cheminOutputCC47 = r'tourinsoft.gdb\PatrimoineCulturel' #Chemin de la table finale
cheminOutputCC47 = r'tourisme@sigora1@vecteur.sde\PatrimoineCulturel'  # Chemin de la table finale
addPhoto = True  # Ajouter les photos en pieces jointes ou non

proxyURL = 'http://132.1.10.230:8080'  # URL du proxy (Null si aucun proxy)

entryXPath = './entry'  # XPath pour chaque entree
elementPropertiesXPath = './content/properties'  # XPath pour les proprietees d'une entree (le root est entryXPath)

objectIDLabel = 'SyndicObjectID'  # Nom de la propriete de l'ID unique de l'objet (pour le lien des pieces jointes)
titleLabel = 'title'  # Nom de la propriete du nom de l'element
pictureLabel = 'Photos'  # Nom de la propriete contenant les liens des photos
xLabel = 'GmapLongitude'  # Nom de la propriete de la coordonnee X
yLabel = 'GmapLatitude'  # Nom de la propriete de la coordonnee Y

customAttributes = dict() #Type de colonnes personalisees. Rajouter une ligne par colonne personalisee: customAttributes['<clef>'] = '<type>'. Ex: customAttributes['CodePostal'] = 'SHORT'

projectionInput = arcpy.SpatialReference(4326)  # Projection en entree (WGS84)
projectionOutput = arcpy.SpatialReference(3947)  # Projection en sortie (L93CC47)
projectionMethod = 'RGF_1993_To_WGS_1984_1'  # Methode de projection

def go():
	Utils.Utils().export(url, tempBddName, addPhoto, tempPicsBddName, cheminOutputCC47, projectionInput, projectionOutput, tempDir, tempPictureDir, proxyURL, entryXPath, elementPropertiesXPath, pictureLabel, objectIDLabel, titleLabel, xLabel, yLabel, projectionMethod, customAttributes)

if __name__ == '__main__':  # Si on a execute ce fichier, let's go!
	go()
