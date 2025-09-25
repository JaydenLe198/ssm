import "react-dom/canary";

declare module "react-dom" {
  function useFormState<State>(
    action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
    initialState: Awaited<State>,
    permalink?: string
  ): [state: Awaited<State>, dispatch: (formData: FormData) => void, isPending: boolean];
}
