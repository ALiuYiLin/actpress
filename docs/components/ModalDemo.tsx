import { defineComponent, ref } from 'actview'
import './modal-demo.css'

export const ModalDemo = defineComponent(function () {
  const showModal = ref(false)

  return function () {
    return (
      <>
        <button class="modal-button" onclick={() => (showModal.value = true)}>
          Show Modal
        </button>

        {showModal.value ? (
          <div class="modal-mask">
            <div class="modal-container">
              <p>Hello from the modal!</p>
              <div class="model-footer">
                <button
                  class="modal-button"
                  onclick={() => (showModal.value = false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    )
  }
})
