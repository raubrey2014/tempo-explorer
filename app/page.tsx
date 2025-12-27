'use client'

import { useForm } from '@tanstack/react-form'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      txId: '',
    },
    onSubmit: async ({ value }) => {
      if (value.txId.trim()) {
        router.push(`/tx/${value.txId.trim()}`)
      }
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl font-bold mb-2 text-center">Tempo Explorer</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
            Explore transactions on the Tempo blockchain
          </p>
          
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="w-full"
          >
            <form.Field
              name="txId"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return 'Transaction Hash is required'
                  }
                  return undefined
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Transaction Hash
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0xd9a25364caeabbff78d76375940ea744b6472967ace30036cb0f3f9d5fce953e"
                    />
                    <button
                      type="submit"
                      disabled={form.state.isSubmitting}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {form.state.isSubmitting ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </form>
        </div>
      </main>
    </div>
  )
}
