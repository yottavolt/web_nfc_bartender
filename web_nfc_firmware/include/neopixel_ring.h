#ifndef NEOPIXEL_RING_H
#define NEOPIXEL_RING_H
#include <Adafruit_NeoPixel.h>
  
enum RingPattern {
    PATTERN_SOLID,
    PATTERN_SPIN_FADE,
    PATTERN_FILL
};
  
class NeoPixelRing {
private:
    Adafruit_NeoPixel _strip;
    uint16_t _numPixels;
    RingPattern _currentPattern = PATTERN_SOLID;
    uint32_t _baseColor = 0;
    uint32_t _lastUpdate = 0;
  
    // Animation parameters
    float _spinSpeed = 0.05f;
    float _fillSpeed = 0.2f;
  
    // Continuous trackers
    float _headPosition = 0.0f;
    float _currentFill = 0.0f;
    float _targetFill = 0.0f;
  
    void getRGB(uint32_t color, uint8_t &r, uint8_t &g, uint8_t &b) {
        r = (uint8_t)(color >> 16);
        g = (uint8_t)(color >> 8);
        b = (uint8_t)color;
    }
  
    void updateSpinFade() {
        uint8_t r, g, b;
        getRGB(_baseColor, r, g, b);
  
        // Move head forward continuously
        _headPosition += _spinSpeed;
        if (_headPosition >= _numPixels) {
            _headPosition -= _numPixels;
        }
  
        // Precompute falloff parameters for performance
        float halfLen = (float)_numPixels * 0.3f; // How wide the glow is
  
        for (uint16_t i = 0; i < _numPixels; i++) {
            // Calculate shortest distance from head to this pixel (wrapping around)
            float dist = _headPosition - (float)i;
            if (dist < 0) dist += _numPixels;
            if (dist > _numPixels / 2.0f) dist = _numPixels - dist; // Wrap to shortest path
  
            // Smooth falloff: Gaussian-like or eased quadratic
            float brightness = 1.0f - (dist / halfLen);
            if (brightness < 0.0f) brightness = 0.0f;
            brightness = brightness * brightness; // Easing for softer edges
  
            // Apply to RGB
            uint8_t pr = (uint8_t)(r * brightness);
            uint8_t pg = (uint8_t)(g * brightness);
            uint8_t pb = (uint8_t)(b * brightness);
  
            _strip.setPixelColor(i, pr, pg, pb);
        }
        _strip.show();
    }
  
    void updateFill() {
        // Smoothly approach target fill percentage over time
        if (_currentFill < _targetFill) {
            _currentFill += _fillSpeed;
            if (_currentFill > _targetFill) _currentFill = _targetFill;
        } else if (_currentFill > _targetFill) {
            _currentFill -= _fillSpeed;
            if (_currentFill < _targetFill) _currentFill = _targetFill;
        }
  
        uint8_t r, g, b;
        getRGB(_baseColor, r, g, b);
  
        // Width of the fade-in transition zone (percentage of strip length)
        // Increase this value for a longer, slower fade. Decrease for a sharper cutoff.
        const float fadeWidth = 10.0f;
  
        for (uint16_t i = 0; i < _numPixels; i++) {
            float ledPos = ((float)i / _numPixels) * 100.0f;
            float brightness = 1.0f - ((ledPos - _currentFill) / fadeWidth);
  
            if (brightness < 0.0f) brightness = 0.0f;
            if (brightness > 1.0f) brightness = 1.0f;
  
            _strip.setPixelColor(i,
                (uint8_t)(r * brightness),
                (uint8_t)(g * brightness),
                (uint8_t)(b * brightness));
        }
        _strip.show();
    }
  
public:
    NeoPixelRing(uint16_t numPixels, uint8_t pin, neoPixelType type = NEO_GRB + NEO_KHZ800)
        : _strip(numPixels, pin, type), _numPixels(numPixels) {}
  
    void init() {
        _strip.begin();
        _strip.show();
    }
  
    void setColor(uint32_t color) {
        _baseColor = color;
        if (_currentPattern == PATTERN_SOLID) {
            for (uint16_t i = 0; i < _numPixels; i++) {
                _strip.setPixelColor(i, _baseColor);
            }
            _strip.show();
        }
    }
  
    void setPattern(RingPattern pattern) {
        _currentPattern = pattern;
        if (pattern == PATTERN_SOLID) {
            setColor(_baseColor);
        }
    }
  
    void setAnimationSpeeds(float spinStep, float fillStep) {
        _spinSpeed = spinStep;
        _fillSpeed = fillStep;
    }
  
    void setFillPercentage(uint8_t percent) {
        if (percent > 100) percent = 100;
        _targetFill = percent;
    }
  
    void handle() {
        if (_currentPattern == PATTERN_SOLID) return;
  
        if (millis() - _lastUpdate >= 16) {
            _lastUpdate = millis();
            switch (_currentPattern) {
                case PATTERN_SPIN_FADE:
                    updateSpinFade();
                    break;
                case PATTERN_FILL:
                    updateFill();
                    break;
            }
        }
    }
  
    uint32_t Color(uint8_t r, uint8_t g, uint8_t b) {
        return _strip.Color(r, g, b);
    }
};
#endif // NEOPIXEL_RING_H