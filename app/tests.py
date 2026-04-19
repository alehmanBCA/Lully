from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Baby, Household, HouseholdMember, Post


class HouseholdSharingTests(TestCase):
	def setUp(self):
		self.owner = User.objects.create_user(username='owner', password='pass12345')
		self.grandma = User.objects.create_user(username='grandma', password='pass12345')
		self.stranger = User.objects.create_user(username='stranger', password='pass12345')

		self.household = Household.objects.create(owner=self.owner, name='Owner Family')
		HouseholdMember.objects.create(household=self.household, user=self.owner, role='owner')

		self.baby = Baby.objects.create(
			parent=self.owner,
			household=self.household,
			name='Mia',
			birth_date=date(2024, 5, 1),
			gender='F',
		)

	def test_join_code_shows_shared_baby_on_profile(self):
		self.client.force_login(self.grandma)

		response = self.client.post(
			reverse('profile'),
			{'action': 'join_household', 'join_code': self.household.join_code},
			follow=True,
		)

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, self.household.join_code)
		self.assertContains(response, 'Mia')

		membership = HouseholdMember.objects.get(user=self.grandma)
		self.assertEqual(membership.household, self.household)
		self.assertEqual(membership.role, 'viewer')

	def test_non_member_cannot_open_monitor(self):
		self.client.force_login(self.stranger)

		response = self.client.get(reverse('monitor_dashboard', args=[self.baby.id]))

		self.assertEqual(response.status_code, 404)

	def test_owner_can_remove_member(self):
		HouseholdMember.objects.create(household=self.household, user=self.grandma, role='viewer')
		membership = HouseholdMember.objects.get(user=self.grandma)

		self.client.force_login(self.owner)
		response = self.client.post(reverse('remove_household_member', args=[membership.id]), follow=True)

		self.assertEqual(response.status_code, 200)
		membership.refresh_from_db()
		self.assertFalse(membership.is_active)

	def test_non_owner_cannot_remove_member(self):
		HouseholdMember.objects.create(household=self.household, user=self.grandma, role='viewer')
		membership = HouseholdMember.objects.get(user=self.grandma)

		self.client.force_login(self.stranger)
		response = self.client.post(reverse('remove_household_member', args=[membership.id]), follow=True)

		self.assertEqual(response.status_code, 200)
		membership.refresh_from_db()
		self.assertTrue(membership.is_active)

	def test_owner_can_delete_community_post(self):
		post = Post.objects.create(user=self.owner, title='My post', caption='Hello community')

		self.client.force_login(self.owner)
		response = self.client.post(reverse('community-delete', args=[post.id]), follow=True)

		self.assertEqual(response.status_code, 200)
		self.assertFalse(Post.objects.filter(id=post.id).exists())

	def test_non_owner_cannot_delete_community_post(self):
		post = Post.objects.create(user=self.owner, title='My post', caption='Hello community')

		self.client.force_login(self.stranger)
		response = self.client.post(reverse('community-delete', args=[post.id]), follow=True)

		self.assertEqual(response.status_code, 404)
		self.assertTrue(Post.objects.filter(id=post.id).exists())

	def test_account_edit_saves_preferences(self):
		self.client.force_login(self.owner)

		response = self.client.post(
			reverse('account_edit'),
			{
				'name': 'Updated Parent',
				'default_min_heart_rate': '55',
				'default_max_heart_rate': '145',
				'default_min_temperature': '36.4',
				'default_max_temperature': '37.8',
				'temperature_unit': 'f',
				'weight_unit': 'lb',
			},
			follow=True,
		)

		self.assertEqual(response.status_code, 200)
		self.owner.refresh_from_db()
		self.assertEqual(self.owner.first_name, 'Updated Parent')

		preference = self.owner.userpreference
		self.assertEqual(preference.default_min_heart_rate, 55)
		self.assertEqual(preference.default_max_heart_rate, 145)
		self.assertAlmostEqual(preference.default_min_temperature, 36.4)
		self.assertAlmostEqual(preference.default_max_temperature, 37.8)
		self.assertEqual(preference.temperature_unit, 'f')
		self.assertEqual(preference.weight_unit, 'lb')
