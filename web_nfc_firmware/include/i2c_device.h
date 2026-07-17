#ifndef I2C_DEVICE_H
#define I2C_DEVICE_H

#include <Arduino.h>  
//yeah i should really pass the required objects here and just not call them but eh it works

//scanning available i2c devices for checking connection
void i2cScan() {
  SerialUSB.println("Scanning I2C bus...");
  for (byte addr = 1; addr < 127; ++addr) {
    Wire.beginTransmission(addr);
    uint8_t error = Wire.endTransmission();
    if (error == 0) {
      SerialUSB.print("I2C device found at 0x");
      SerialUSB.println(addr, HEX);
    } else if (error == 4) {
      SerialUSB.print("Unknown error at 0x");
      SerialUSB.println(addr, HEX);
    }
  }
  SerialUSB.println("I2C scan done.");
}

//init pullups and wire for st25dv
void initi2c(){
  //enable pull ups fori²c, (not recommended for production, but im lazy for manual connection)
  pinMode(PB6, INPUT_PULLUP); // SCL
  pinMode(PB7, INPUT_PULLUP); // SDA

  //init i2c on PB6 SCL and PB7 SDA
  Wire.begin();
  SerialUSB.println("Wire init corrrect");

}

void waitloop(){
    for(int i=0; i<10; i++){
        SerialUSB.println("Waiting...");
        delay(1000);
    }
}

void initnfcdevice(ST25DV &nfcdevice){
  if(nfcdevice.begin() == 0) {
    SerialUSB.println("ST25 connection sucess");
  } else {
    SerialUSB.println("Fault");
    while(1);
  }
}

void writeURI(String ndef, ST25DV &nfcdevice){
  const char* uri_write_message = ndef.c_str();
  const char uri_write_protocol[] = URI_ID_0x04_STRING; // Uri protocol to write in the tag
  String uri_write = String(uri_write_protocol) + String(uri_write_message);

  if(nfcdevice.writeURI(uri_write_protocol, uri_write_message, "")) {
    SerialUSB.println("Write failed!");
    while(1);
  }
}

#endif // I2C_DEVICE