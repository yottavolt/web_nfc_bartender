#ifndef SOLENOID_DRIVER_H
#define SOLENOID_DRIVER_H

#include <Arduino.h>

/**
 * SolenoidDriver Class
 * Handles sequential testing of solenoids using Software PWM via Timer Interrupt.
 * Works on all pins (including PA8, PA9) by manually toggling them in an ISR.
 */
class SolenoidDriver {
private:
    // "inline" tells the compiler to allocate memory for this variable right here in the header.
    // This fixes the "undefined reference" error.
    inline static SolenoidDriver* _instance = nullptr;

    const uint8_t _pins[6] = {PB12, PB13, PB14, PB15, PA8, PA9};
    const uint8_t _numPins = 6;
    
    // The maximum steps in our software PWM counter
    const uint8_t _pwmMaxSteps = 25; 
    
    uint8_t _dutyCycles[6] = {0, 0, 0, 0, 0, 0};
    uint8_t _pwmCounter = 0; // Counts 0 to 24

    // The Timer Interrupt Service Routine
    static void timerISR() {
        if (_instance == nullptr) return;

        _instance->_pwmCounter++;
        if (_instance->_pwmCounter >= _instance->_pwmMaxSteps) {
            _instance->_pwmCounter = 0;
        }

        for (uint8_t i = 0; i < _instance->_numPins; i++) {
            if (_instance->_pwmCounter < _instance->_dutyCycles[i]) {
                digitalWrite(_instance->_pins[i], HIGH);
            } else {
                digitalWrite(_instance->_pins[i], LOW);
            }
        }
    }

    void setupTimer() {
        // Using HardwareTimer(TIM2) for STM32duino compatibility
        HardwareTimer *MyTim = new HardwareTimer(TIM2);
        
        // Set frequency to 10kHz. 
        // 10,000Hz / 25 steps = 400Hz actual PWM frequency.
        MyTim->setOverflow(10000, HERTZ_FORMAT); 
        MyTim->attachInterrupt(timerISR);
        MyTim->resume();
    }

public:
    SolenoidDriver() {
        _instance = this;
    }

    void init() {
        for (uint8_t i = 0; i < _numPins; i++) {
            pinMode(_pins[i], OUTPUT);
            digitalWrite(_pins[i], LOW);
            _dutyCycles[i] = 0;
        }
        setupTimer();
    }

    /**
     * Executes the test sequence:
     * For each pin: Set to 80% -> Wait 500ms -> Set to 0% -> Wait 1s
     */
    void test() {

        for (u_int64_t j=0; j<10; j++){

            for (uint8_t i = 0; i < _numPins; i++) {
                setPin(i, 100);  // 80% Duty Cycle
                delay(500);
                setPin(i, 0);   // 0% Duty Cycle (Off)
                delay(100);
            }
        }
    }

    /**
     * Sets the duty cycle for a specific solenoid pin.
     * 
     * @param pin_index (0 to 5)
     * @param duty_percentage (0 to 100) -> 0 is fully off, 100 is fully on
     */
    void setPin(uint8_t pin_index, uint8_t duty_percentage) {
        if (pin_index < _numPins) {
            // Constrain input to safety limits (0-100%)
            if (duty_percentage > 100) {
                duty_percentage = 100;
            }
            
            // Map 0-100% down to our 0-25 step software PWM resolution
            // Adding 50 before dividing by 100 handles standard integer rounding properly.
            _dutyCycles[pin_index] = ((uint16_t)duty_percentage * _pwmMaxSteps + 50) / 100;
        }
    }
};

#endif // SOLENOID_DRIVER_H