function mostrarCamposAdicionales(valor) {
  document.getElementById("campos-maternidad").style.display = valor === "maternidad" ? "block" : "none";
  document.getElementById("campos-cirugia").style.display = valor === "cirugia" ? "block" : "none";
  document.getElementById("campos-derivacion").style.display = valor === "derivacion" ? "block" : "none";
  document.getElementById("campos-urgencia").style.display = valor === "urgencia" ? "block" : "none";

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

document.addEventListener('DOMContentLoaded', function() {
  const motivoSelect = document.getElementById('motivo');
  if (motivoSelect) {
    mostrarCamposAdicionales(motivoSelect.value); 
    motivoSelect.addEventListener('change', (event) => { 
        mostrarCamposAdicionales(event.target.value);
    });
  }
});