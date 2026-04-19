from django import forms
from .models import Baby


from .models import Post, Comment

class BabyForm(forms.ModelForm):
    class Meta:
        model = Baby
        fields = ['name', 'birth_date', 'gender', 'weight_kg']
        widgets = {
            'birth_date': forms.DateInput(attrs={'type': 'date'}),
        }


class PostForm(forms.ModelForm):
    is_question = forms.BooleanField(
        required=False,
        label='Mark this post as a question',
        widget=forms.CheckboxInput(attrs={'class': 'question-checkbox'})
    )

    class Meta:
        model = Post
        fields = ['title', 'caption', 'tags', 'image']
        widgets = {
            'title': forms.TextInput(attrs={'placeholder': 'Ask a question or share a fun post'}),
            'caption': forms.Textarea(attrs={'rows': 4, 'placeholder': 'Write your post...'}),
            'tags': forms.TextInput(attrs={'placeholder': '#help #fun #school'}),
        }

    def clean_tags(self):
        raw_tags = self.cleaned_data.get('tags', '')
        pieces = [piece.strip() for piece in raw_tags.replace(',', ' ').split()]
        cleaned = []
        for piece in pieces:
            if not piece:
                continue
            cleaned.append(piece if piece.startswith('#') else f'#{piece}')
        return ' '.join(cleaned)

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.post_type = 'question' if self.cleaned_data.get('is_question') else 'fun'
        if commit:
            instance.save()
        return instance


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['text']
        widgets = {
            'text': forms.TextInput(attrs={'placeholder': 'Add a comment...'}),
        }