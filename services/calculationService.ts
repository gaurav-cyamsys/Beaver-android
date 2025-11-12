export class CalculationService {
  static calculateFinalLoad(
    currentReading: number,
    initialReading: number,
    gaugeFactor: number
  ): number {
    return (currentReading - initialReading) * gaugeFactor;
  }

  static calculateDigits(currentReading: number): number {
    return (currentReading * currentReading) / 1000;
  }

  static convertCelsiusToFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
  }

  static convertFahrenheitToCelsius(fahrenheit: number): number {
    return ((fahrenheit - 32) * 5) / 9;
  }

  static formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  static formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}
