# eas Build command

- npx eas build --platform android
- git add app.json
- git commit -m "Include app.json to apply updated app name in EAS Build"
- git push origin main

## After Install

- rename file to app.aab
- copy to C:\Users\ASUS\bundletool\

## next run commands

- C:\Users\ASUS\bundletool> java -jar bundletool-all-1.18.1.jar build-apks --bundle=app.aab --output=Vinto.apks --ks=@mithun1634__Brill-daddy.jks --ks-key-alias=a3857e1dd6b07a2571d5c5e123742cae --ks-pass=pass:ec43bc359cb0528092061cab92a891e2 --key-pass=pass:b8d40c76497241250ad3743d76628034 --mode=universal
- Rename-Item Vinto.apks Vinto.zip
- Expand-Archive Vinto.zip -DestinationPath Vinto-apks
- adb install Vinto-apks\universal.apk
