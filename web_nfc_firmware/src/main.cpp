#include <Arduino.h>
#include "ST25DVSensor.h"
#include <Wire.h>
#include "i2c_device.h"
#include <string.h>
#include "solenoid_driver.h"
#include "neopixel_ring.h" // Include your new header

#define DEV_I2C Wire
ST25DV st25dv(-1, -1, &DEV_I2C);

// Configurable LED count and pin assignments
#define LED_PIN    PB10
#define LED_COUNT  8 // Changed to 12 to make the ring patterns visible

NeoPixelRing ring(LED_COUNT, LED_PIN);
SolenoidDriver solenoids;

void initTag(){
  Serial.println("Tag init");
  writeURI("yottavolt.github.io/web_nfc_bartender/?active=Fhttps://yottavolt.github.io/web_nfc_bartender?active=FFF", st25dv);
}

void setup() {
  SerialUSB.begin();
  delay(1500);
  SerialUSB.println("SerialUSB working!");

  initi2c();
  i2cScan();
  initnfcdevice(st25dv);
  initTag();

  // Initialize our new ring setup
  ring.init();
  ring.setColor(ring.Color(0, 80, 190)); // Start dim blue
  ring.setPattern(PATTERN_SPIN_FADE);
  ring.setAnimationSpeeds(0.02f, 0.08f);

  solenoids.init();
}

void parseString(String input){
  SerialUSB.println(input);

  // Activate cleaning / test mode
  if (input.startsWith("<01>")) {

    ring.setColor(ring.Color(0, 255, 0)); // Green fill color
    ring.setAnimationSpeeds(0.2f, 0.4f);
    ring.setFillPercentage(50);
    ring.setPattern(PATTERN_FILL);
    

    //solenoids.test();
    
  } 
}

void loop() {  
  // CRITICAL CHANGE: We must remove the large delay(2500) from the main loop!
  // If we leave delay(2500), the animations will pause and stutter.
  // Instead, use a non-blocking millis timer for the NFC check:
  
  static uint32_t lastNFCCheck = 0;
  
  // Call the LED loop handler constantly every execution cycle
  ring.handle(); 

  // Check the NFC tag periodically without stopping the CPU

  if (millis() - lastNFCCheck >= 1000) {
    lastNFCCheck = millis();
    
    String uri_read;
    if(st25dv.readText(&uri_read)) {        
      SerialUSB.println("No-Update");
    }
    else {             
      SerialUSB.println("Updated data detected");     
      parseString(uri_read.c_str());
      initTag();
    }
  }

}