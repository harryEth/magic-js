## Upcoming Changes

#### Fixed

- ...

#### Changed

- ...

#### Added

- The new `Extension` interface will soon enable Magic SDK to support official
  and third-party plugins!

## `1.1.2` - 04/22/2020

#### Fixed

- Certain NodeJS globals/polyfills were not available in React Native environments. These polyfills are now bootstrapped automatically.

## `1.1.1` - 04/22/2020

#### Added

- Support for React Native:

```tsx
// Import the React Native bundle
// (Don't worry, the API is exactly the same!)
import { Magic } from 'magic-sdk/react-native';

const magic = new Magic('API_KEY');

function App() {
  return (<div>
    {/* Just render the `Modal` component to connect Magic SDK! 🚀 */}
    <magic.Relayer />
  </div>);
}
```

## `1.0.3` - 04/21/2020

#### Added

- `UpdateEmailFailed` RPCErrorCode for when update email fails.

## `1.0.2` - 04/15/2020

#### Added

- `preload` method for downloading the assets required to render the Magic `<iframe>`.

## `1.0.1` - 04/09/2020

This is the first release our changelog records. Future updates will be logged in the following format:

#### Fixed

- Bug fixes and patches will be described here.

#### Changed

- Changes (breaking or otherwise) to current APIs will be described here.

#### Added

- New features or APIs will be described here.
