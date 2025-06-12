// Esta función es para la página de nueva.pug para mostrar/ocultar campos adicionales.
// No usa 'require' porque se ejecuta en el navegador.
function mostrarCamposAdicionales(valor) {
  const camposMaternidad = document.getElementById("campos-maternidad");
  const camposCirugia = document.getElementById("campos-cirugia");
  const camposDerivacion = document.getElementById("campos-derivacion");
  const camposUrgencia = document.getElementById("campos-urgencia");

  if (camposMaternidad) camposMaternidad.style.display = valor === "maternidad" ? "block" : "none";
  if (camposCirugia) camposCirugia.style.display = valor === "cirugia" ? "block" : "none";
  if (camposDerivacion) camposDerivacion.style.display = valor === "derivacion" ? "block" : "none";
  if (camposUrgencia) camposUrgencia.style.display = valor === "urgencia" ? "block" : "none";

  const allConditionalFields = document.querySelectorAll('#campos-maternidad select, #campos-maternidad input, #campos-maternidad textarea, ' +
                                                    '#campos-cirugia select, #campos-cirugia input, #campos-cirugia textarea, ' +
                                                    '#campos-derivacion select, #campos-derivacion input, #campos-derivacion textarea, ' +
                                                    '#campos-urgencia select, #campos-urgencia input, #campos-urgencia textarea');

  allConditionalFields.forEach(field => {
    field.removeAttribute('required');
  });

  const visibleSection = document.getElementById(`campos-${valor}`);
  if (visibleSection) {
    const fieldsInVisibleSection = visibleSection.querySelectorAll('select, input, textarea');
    fieldsInVisibleSection.forEach(field => {
      if (field.type !== 'checkbox' && field.type !== 'radio' && field.name !== 'motivo') {
         field.setAttribute('required', 'required');
      }
    });
  }
}

// Se ejecuta una vez que el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', function() {
  // Lógica para la página de nueva.pug
  const motivoSelect = document.getElementById('motivo');
  if (motivoSelect) {
    // Si estamos en nueva.pug, inicializa los campos condicionales y añade el listener.
    mostrarCamposAdicionales(motivoSelect.value);
    motivoSelect.addEventListener('change', (event) => {
        mostrarCamposAdicionales(event.target.value);
    });
  }

  // --- LÓGICA PARA seleccionar_cama.pug ---
  const alaSelect = document.getElementById('ala');
  const habitacionesContainer = document.getElementById('habitaciones-container');
  const selectedCamaIdInput = document.getElementById('selected_cama_id');
  const btnFinalizarInternacion = document.getElementById('btn-finalizar-internacion');

  // Asegúrate de que `pacienteSexo` esté definido globalmente en seleccionar_cama.pug
  // por el script inline dentro de ese archivo.

  if (alaSelect && habitacionesContainer) { // Solo ejecuta esta lógica si estos elementos existen
    alaSelect.addEventListener('change', async () => {
      const alaId = alaSelect.value;
      habitacionesContainer.innerHTML = ''; // Limpiar habitaciones anteriores
      selectedCamaIdInput.value = ''; // Limpiar cama seleccionada
      btnFinalizarInternacion.disabled = true; // Deshabilitar botón de finalizar

      if (alaId) {
        try {
          const response = await fetch(`/internaciones/api/habitaciones-por-ala/${alaId}`);
          const habitaciones = await response.json();

          if (habitaciones.length > 0) {
            habitaciones.forEach(habitacion => {
              const habitacionCardCol = document.createElement('div');
              habitacionCardCol.classList.add('col-md-6', 'col-lg-4'); // 2 o 3 columnas por fila
              habitacionCardCol.innerHTML = `
                <div class="card h-100 shadow-sm border-secondary">
                  <div class="card-header bg-light">
                    <h5 class="mb-0 text-primary">Habitación ${habitacion.numero_habita || habitacion.numero}</h5>
                    <small class="text-muted">Capacidad: ${habitacion.capacidad}</small>
                  </div>
                  <div class="card-body">
                    <div id="camas-display-${habitacion.id}" class="d-flex flex-wrap gap-2 justify-content-center">
                      <span class="badge bg-secondary">Cargando camas...</span>
                    </div>
                  </div>
                </div>
              `;
              habitacionesContainer.appendChild(habitacionCardCol);

              // Cargar camas para cada habitación y mostrarlas dentro de la tarjeta
              loadAndDisplayCamasInCard(habitacion.id, `camas-display-${habitacion.id}`);
            });
          } else {
            habitacionesContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">No hay habitaciones en esta ala.</div></div>';
          }
        } catch (error) {
          console.error('Error al cargar habitaciones:', error);
          habitacionesContainer.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error al cargar las habitaciones.</div></div>';
        }
      }
    });

    // Función para cargar las camas y mostrarlas como "tarjetas" pequeñas dentro de la tarjeta de la habitación
    async function loadAndDisplayCamasInCard(habitacionId, containerId) {
        const container = document.getElementById(containerId);
        try {
            const response = await fetch(`/internaciones/api/camas-por-habitacion/${habitacionId}`);
            const camas = await response.json();
            container.innerHTML = ''; // Limpiar el "Cargando camas..."

            if (camas.length > 0) {
                camas.forEach(cama => {
                    const camaBadge = document.createElement('div');
                    camaBadge.classList.add('cama-badge', 'rounded-3', 'p-2', 'text-center', 'shadow-sm');
                    camaBadge.setAttribute('data-cama-id', cama.id);
                    camaBadge.style.cursor = 'pointer';

                    let camaStatusText = '';
                    let isSelectable = false;
                    let backgroundColorClass = '';
                    let textColorClass = 'text-white';
                    let iconClass = '';

                    if (cama.estado === 'libre' && cama.higienizada === 1) {
                        let isAptaPorSexo = true;
                        if (cama.capacidad > 1 && typeof pacienteSexo !== 'undefined' && pacienteSexo !== null) {
                            const otrasCamasEnHabitacion = camas.filter(oc => oc.id !== cama.id && oc.estado === 'ocupada');
                            if (otrasCamasEnHabitacion.length > 0) {
                                for(const oc of otrasCamasEnHabitacion) {
                                    if (oc.sexo_paciente_ocupante && oc.sexo_paciente_ocupante !== pacienteSexo) {
                                        isAptaPorSexo = false;
                                        break;
                                    }
                                }
                            }
                        }

                        if (isAptaPorSexo) {
                            backgroundColorClass = 'bg-success';
                            camaStatusText = 'Libre';
                            isSelectable = true;
                            iconClass = 'bi-check-circle-fill';
                        } else {
                            backgroundColorClass = 'bg-danger';
                            camaStatusText = 'No apta (Sexo)';
                            iconClass = 'bi-gender-ambiguous';
                        }
                    } else if (cama.estado === 'libre' && cama.higienizada === 0) {
                        backgroundColorClass = 'bg-warning';
                        camaStatusText = 'Sin Hig.';
                        textColorClass = 'text-dark';
                        iconClass = 'bi-exclamation-triangle-fill';
                    } else if (cama.estado === 'ocupada') {
                        if (cama.sexo_paciente_ocupante === 'M') {
                            backgroundColorClass = 'bg-primary-blue';
                            camaStatusText = 'Ocupada (H)';
                            iconClass = 'bi-person-fill';
                        } else if (cama.sexo_paciente_ocupante === 'F') {
                            backgroundColorClass = 'bg-primary-pink';
                            camaStatusText = 'Ocupada (M)';
                            iconClass = 'bi-person-circle-fill';
                        } else {
                            backgroundColorClass = 'bg-warning';
                            camaStatusText = 'Ocupada';
                            textColorClass = 'text-dark';
                            iconClass = 'bi-person-fill';
                        }
                    } else if (cama.estado === 'en_mantenimiento') {
                        backgroundColorClass = 'bg-secondary';
                        camaStatusText = 'Mant.';
                        iconClass = 'bi-tools';
                    } else {
                        backgroundColorClass = 'bg-danger';
                        camaStatusText = 'Error';
                        iconClass = 'bi-x-circle-fill';
                    }


                    camaBadge.classList.add(backgroundColorClass);
                    if (isSelectable) {
                        camaBadge.classList.add('cama-selectable');
                    } else {
                        camaBadge.style.cursor = 'not-allowed';
                    }

                    camaBadge.innerHTML = `
                        <i class="bi ${iconClass} ${textColorClass} mb-1"></i>
                        <div class="fw-bold ${textColorClass}">C${cama.numero_cama}</div>
                        <small class="${textColorClass}">${camaStatusText}</small>
                    `;
                    container.appendChild(camaBadge);
                });
                addCamaBadgeListeners();
            } else {
                container.innerHTML = '<span class="badge bg-info">Sin camas.</span>';
            }
        } catch (error) {
            console.error('Error al cargar camas para tarjeta:', error);
            container.innerHTML = '<span class="badge bg-danger">Error al cargar camas.</span>';
        }
    }

    // Función para manejar la selección de una cama (clic en el badge de cama)
    function addCamaBadgeListeners() {
      document.querySelectorAll('.cama-selectable').forEach(badge => {
        badge.addEventListener('click', () => {
          // Remover la selección de cualquier otra cama
          document.querySelectorAll('.cama-selectable').forEach(otherBadge => {
            otherBadge.classList.remove('selected-cama');
          });

          // Resaltar la cama seleccionada
          badge.classList.add('selected-cama');

          // Guardar el ID de la cama en el input oculto
          selectedCamaIdInput.value = badge.dataset.camaId;
          btnFinalizarInternacion.disabled = false; // Habilitar botón de finalizar
        });
      });
    }
  } // Fin if (alaSelect && habitacionesContainer)
});
