# Mero HR - Developer Guide

## Payroll Precision
Always use the `PayrollCalculationEngine` for financial math.
- Never hardcode the 11% or 20% SSF values; use the engine methods to ensure consistency.
- Precision is set at **2 decimal places** for all currency fields in the database.

## Date Conversions
payroll and leave often reference **Bikram Sambat (BS)** dates.
- Database storage is always **Gregorian**.
- Use the `CalendarService` for any BS <-> AD conversions before returning data to the frontend.

## Document Storage
Employee citizenship and photos should be uploaded via the `FileStorageService`.
- Folders should be structured as: `org_{id}/hr/emp_{id}/...`
- Ensure private access is set; these documents must not be publicly accessible.

## Extending Slabs
Nepal Tax slabs change annually.
- Update the `calculateIncomeTax` method in `PayrollCalculationEngine` when the Inland Revenue Department (IRD) releases new fiscal year budgets.
