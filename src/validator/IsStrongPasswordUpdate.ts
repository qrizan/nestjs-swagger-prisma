import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsStrongPasswordUpdate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPasswordUpdate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === undefined || value === null || value === '') {
            return true;
          }

          return (
            typeof value === 'string' &&
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(
              value,
            )
          );
        },
        defaultMessage() {
          return 'Password is not secure enough';
        },
      },
    });
  };
}
