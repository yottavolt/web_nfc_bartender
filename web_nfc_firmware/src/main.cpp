#include<Arduino.h>
#include "ST25DVSensor.h"
#include <Wire.h>
#include "i2c_device.h"
#include <Adafruit_NeoPixel.h>
#include <string.h>
#include "solenoid_driver.h"

#define DEV_I2C Wire
ST25DV st25dv(-1, -1, &DEV_I2C);

#define LED_PIN    PB10
#define LED_COUNT  1
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
SolenoidDriver solenoids;

void initTag(){
  Serial.println("Tag init");
  writeURI("yottavolt.github.io/web_nfc_bartender/?active=Fhttps://yottavolt.github.io/web_nfc_bartender?active=FFF", st25dv);
}

void setup() {

  // Initialize serial for output.
   SerialUSB.begin();

   //waiting for serial usb to conenct causes wait until com port open so a no no
   delay(1500);

  SerialUSB.println("SerialUSB working!");

  initi2c();
  i2cScan();
  initnfcdevice(st25dv);
  initTag();

   strip.begin();
   strip.show();

   strip.setPixelColor(0, strip.Color(10, 10, 0)); // Red
   strip.show();
   solenoids.init();
}

void parseString(String input){
  SerialUSB.println(input);

  //Activate cleaning / test mode
  if (input.startsWith("<01>")) {
    solenoids.test();
  } 
}


void loop() {  

  delay(2500);

  String uri_read;
  if(st25dv.readText(&uri_read)) {        //if no text nothing has been changed, if text then new data has been written by application, then update data
    SerialUSB.println("No-Update");
  }
  else{             
    SerialUSB.println("Updated data detected");     //do something with thew data and write url back to the tag
    
    parseString(uri_read.c_str());
    initTag();
  }

    

} 


//functionality ==> accept recipe string with time/liquid input, acitvate 3 at a time
//init all drinks fluid levels during init
//reset / fill them with password
//if drink empty reject with red led ring

//idle led ring, sucess and fail maybe finish 


