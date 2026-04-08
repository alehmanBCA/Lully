from django import forms
from .models import Baby

class BabyForm(forms.ModelForm):
    class Meta:
        model = Baby
        fields = ['name', 'birth_date', 'gender', 'weight_kg']
        widgets = {
            'birth_date': forms.DateInput(attrs={'type': 'date'}),
        }